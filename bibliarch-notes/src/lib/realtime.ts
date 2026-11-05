// Ported from storycanvas's src/lib/hooks/useCollaboration.ts — the
// broadcast-based live-sync layer. Kept close to the original on purpose:
// this is the single riskiest part of the live app (echo-loop prevention via
// a loaded-before-subscribing userId, channel cleanup on every dependency
// change, Realtime's ~256KB broadcast cap) and it's already correct in
// production. Database saves remain the durability layer; these channels are
// purely for "what does the other person see right now."
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { StoryConnection, StoryNode } from "@/lib/types";

const REALTIME_PAYLOAD_WARN_BYTES = 200 * 1024;

export type ConnectionStatus = "connected" | "connecting" | "disconnected";

export interface LockedNode {
  nodeId: string;
  odataUserId: string;
  username: string;
  field: string;
}

export interface PresenceState {
  odataUserId: string;
  username: string;
  color: string;
  lastSeen: number;
}

const PRESENCE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#06b6d4"];
function randomColor() {
  return PRESENCE_COLORS[Math.floor(Math.random() * PRESENCE_COLORS.length)]!;
}

export function useRealtimeCanvas(
  storyId: string | null,
  canvasType: string,
  onRemoteChange: (data: { nodes: StoryNode[]; connections: StoryConnection[]; userId: string }) => void,
  onNodeLock?: (data: LockedNode) => void,
  onNodeUnlock?: (data: { nodeId: string; odataUserId: string }) => void,
  onReconnect?: () => void
) {
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const [userIdLoaded, setUserIdLoaded] = useState(false);
  const onRemoteChangeRef = useRef(onRemoteChange);
  const onNodeLockRef = useRef(onNodeLock);
  const onNodeUnlockRef = useRef(onNodeUnlock);
  const onReconnectRef = useRef(onReconnect);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    onRemoteChangeRef.current = onRemoteChange;
  }, [onRemoteChange]);
  useEffect(() => {
    onNodeLockRef.current = onNodeLock;
  }, [onNodeLock]);
  useEffect(() => {
    onNodeUnlockRef.current = onNodeUnlock;
  }, [onNodeUnlock]);
  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  useEffect(() => {
    supabaseRef.current.auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null;
      setUserIdLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!storyId) {
      setConnectionStatus("disconnected");
      return;
    }
    // Must wait for userId before subscribing — otherwise an early echo of
    // our own broadcast can't be filtered out and gets applied as if it came
    // from someone else.
    if (!userIdLoaded) {
      setConnectionStatus("connecting");
      return;
    }
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setConnectionStatus("connecting");
    // Only the FIRST SUBSCRIBED after an actual drop should trigger
    // onReconnect's resync — the very first connect for this channel is
    // redundant with (and can race) the page's own initial load. Scoped to
    // this effect run, so switching canvasType resets it correctly too.
    let everConnected = false;

    const channel = supabaseRef.current
      .channel(`canvas-collab:${storyId}:${canvasType}`)
      .on("broadcast", { event: "canvas-update" }, (payload) => {
        if (payload.payload?.userId === userIdRef.current) return;
        onRemoteChangeRef.current({
          nodes: payload.payload?.nodes ?? [],
          connections: payload.payload?.connections ?? [],
          userId: payload.payload?.userId ?? "remote",
        });
      })
      .on("broadcast", { event: "node-lock" }, (payload) => {
        if (payload.payload?.odataUserId === userIdRef.current) return;
        onNodeLockRef.current?.({
          nodeId: payload.payload?.nodeId,
          odataUserId: payload.payload?.odataUserId,
          username: payload.payload?.username,
          field: payload.payload?.field,
        });
      })
      .on("broadcast", { event: "node-unlock" }, (payload) => {
        if (payload.payload?.odataUserId === userIdRef.current) return;
        onNodeUnlockRef.current?.({ nodeId: payload.payload?.nodeId, odataUserId: payload.payload?.odataUserId });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
          if (everConnected) onReconnectRef.current?.();
          everConnected = true;
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setConnectionStatus("disconnected");
        } else {
          setConnectionStatus("connecting");
        }
      });

    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setConnectionStatus("disconnected");
    };
  }, [storyId, canvasType, userIdLoaded]);

  const broadcastChange = useCallback((nodes: StoryNode[], connections: StoryConnection[]) => {
    if (!channelRef.current) return;
    const payload = { nodes, connections, userId: userIdRef.current };
    const bytes = JSON.stringify(payload).length;
    if (bytes > REALTIME_PAYLOAD_WARN_BYTES) {
      console.error(
        `Canvas broadcast is ${Math.round(bytes / 1024)}KB, at or over the Realtime message limit — collaborators won't receive it. Usually means a node is carrying inline image data instead of a storage path.`
      );
    }
    channelRef.current.send({ type: "broadcast", event: "canvas-update", payload }).catch((err) => {
      console.error("Broadcast error:", err);
    });
  }, []);

  const broadcastNodeLock = useCallback((nodeId: string, field: string, username: string) => {
    if (!channelRef.current || !userIdRef.current) return;
    channelRef.current.send({ type: "broadcast", event: "node-lock", payload: { nodeId, field, odataUserId: userIdRef.current, username } });
  }, []);

  const broadcastNodeUnlock = useCallback((nodeId: string) => {
    if (!channelRef.current || !userIdRef.current) return;
    channelRef.current.send({ type: "broadcast", event: "node-unlock", payload: { nodeId, odataUserId: userIdRef.current } });
  }, []);

  return { broadcastChange, broadcastNodeLock, broadcastNodeUnlock, connectionStatus };
}

export function useStoryCoordination(
  storyId: string | null,
  onSaveRequest?: () => void,
  onRoleChange?: (targetUserId: string, newRole: string) => void,
  onCollaboratorRemoved?: (targetUserId: string) => void,
  onCollaboratorsChanged?: () => void
) {
  const supabaseRef = useRef(createClient());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string | null>(null);
  const [userIdLoaded, setUserIdLoaded] = useState(false);
  const onSaveRequestRef = useRef(onSaveRequest);
  const onRoleChangeRef = useRef(onRoleChange);
  const onCollaboratorRemovedRef = useRef(onCollaboratorRemoved);
  const onCollaboratorsChangedRef = useRef(onCollaboratorsChanged);

  useEffect(() => {
    onSaveRequestRef.current = onSaveRequest;
  }, [onSaveRequest]);
  useEffect(() => {
    onRoleChangeRef.current = onRoleChange;
  }, [onRoleChange]);
  useEffect(() => {
    onCollaboratorRemovedRef.current = onCollaboratorRemoved;
  }, [onCollaboratorRemoved]);
  useEffect(() => {
    onCollaboratorsChangedRef.current = onCollaboratorsChanged;
  }, [onCollaboratorsChanged]);

  useEffect(() => {
    supabaseRef.current.auth.getUser().then(({ data }) => {
      userIdRef.current = data.user?.id ?? null;
      setUserIdLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!storyId || !userIdLoaded) return;
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    const channel = supabaseRef.current
      .channel(`story-coord:${storyId}`)
      .on("broadcast", { event: "save-request" }, (payload) => {
        if (userIdRef.current && payload.payload?.userId === userIdRef.current) return;
        onSaveRequestRef.current?.();
      })
      .on("broadcast", { event: "role-change" }, (payload) => {
        if (payload.payload?.targetUserId === userIdRef.current) {
          onRoleChangeRef.current?.(payload.payload?.targetUserId, payload.payload?.newRole);
        }
      })
      .on("broadcast", { event: "collaborator-removed" }, (payload) => {
        if (payload.payload?.targetUserId === userIdRef.current) {
          onCollaboratorRemovedRef.current?.(payload.payload?.targetUserId);
        }
      })
      .on("broadcast", { event: "collaborators-changed" }, () => {
        onCollaboratorsChangedRef.current?.();
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [storyId, userIdLoaded]);

  const broadcastSaveRequest = useCallback(() => {
    if (!channelRef.current || !userIdRef.current) return;
    channelRef.current.send({ type: "broadcast", event: "save-request", payload: { userId: userIdRef.current } });
  }, []);
  const broadcastRoleChange = useCallback((targetUserId: string, newRole: string) => {
    channelRef.current?.send({ type: "broadcast", event: "role-change", payload: { targetUserId, newRole, changedBy: userIdRef.current } });
  }, []);
  const broadcastCollaboratorRemoved = useCallback((targetUserId: string) => {
    channelRef.current?.send({ type: "broadcast", event: "collaborator-removed", payload: { targetUserId, removedBy: userIdRef.current } });
  }, []);
  const broadcastCollaboratorsChanged = useCallback(() => {
    channelRef.current?.send({ type: "broadcast", event: "collaborators-changed", payload: { changedBy: userIdRef.current } });
  }, []);

  return { broadcastSaveRequest, broadcastRoleChange, broadcastCollaboratorRemoved, broadcastCollaboratorsChanged };
}

// Who else is looking at this board right now — no cursor tracking, matching
// storycanvas's own tradeoff (removed there for performance).
export function usePresence(storyId: string | null, canvasType: string, username: string) {
  const supabaseRef = useRef(createClient());
  const [presenceState, setPresenceState] = useState<Record<string, PresenceState>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userColorRef = useRef(randomColor());
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!storyId) return;
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    let channel: RealtimeChannel | null = null;
    let mounted = true;

    (async () => {
      const { data } = await supabaseRef.current.auth.getUser();
      if (!mounted) return;
      if (data.user) currentUserIdRef.current = data.user.id;

      channel = supabaseRef.current.channel(`presence:${storyId}:${canvasType}`, { config: { presence: { key: "user" } } });

      function resync() {
        const state = channel!.presenceState();
        const next: Record<string, PresenceState> = {};
        Object.values(state).forEach((entries) => {
          const arr = entries as unknown as PresenceState[];
          if (arr.length > 0 && arr[0]!.odataUserId !== currentUserIdRef.current) next[arr[0]!.odataUserId] = arr[0]!;
        });
        setPresenceState(next);
      }

      channel
        .on("presence", { event: "sync" }, resync)
        .on("presence", { event: "join" }, resync)
        .on("presence", { event: "leave" }, resync)
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED" && data.user) {
            await channel!.track({ odataUserId: data.user.id, username: username || "Anonymous", color: userColorRef.current, lastSeen: Date.now() });
          }
        });

      channelRef.current = channel;
    })();

    return () => {
      mounted = false;
      setPresenceState({});
      channel?.unsubscribe();
      channelRef.current = null;
    };
  }, [storyId, canvasType, username]);

  return { presenceState, userColor: userColorRef.current };
}
