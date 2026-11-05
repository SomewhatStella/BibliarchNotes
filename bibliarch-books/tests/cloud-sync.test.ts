import {it,expect} from 'vitest';
import {cloudOpenDecision} from '../src/cloud-sync';
it('opens remote only for a fresh unchanged device or identical content',()=>{expect(cloudOpenDecision(true,true,'local','remote',null,2)).toBe('load');expect(cloudOpenDecision(false,true,'same','same',null,2)).toBe('load');});
it('retains uncommitted local changes and never overwrites an unknown remote',()=>{expect(cloudOpenDecision(false,true,'draft','remote',null,2)).toBe('conflict');expect(cloudOpenDecision(true,false,'edited','remote',null,2)).toBe('conflict');});
it('resumes known pending edits only when the cloud version still matches',()=>{expect(cloudOpenDecision(false,true,'draft','remote',{version:2,snapshot:'remote'},2)).toBe('save');expect(cloudOpenDecision(false,true,'draft','new remote',{version:2,snapshot:'remote'},3)).toBe('conflict');});
it('accepts remote changes when the local draft is the last saved version',()=>{expect(cloudOpenDecision(false,true,'old','new',{version:2,snapshot:'old'},3)).toBe('load');});
