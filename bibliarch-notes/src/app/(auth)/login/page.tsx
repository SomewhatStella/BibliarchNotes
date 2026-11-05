import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <p className="eyebrow">BIBLIARCH · NOTES</p>
      <h1>Welcome back</h1>
      <p>One account for Notes and Books.</p>
      <AuthForm mode="login" />
      <Link href="/signup" className="switch-mode">New here? Create an account</Link>
    </>
  );
}
