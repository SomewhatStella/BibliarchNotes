import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Create an account" };

export default function SignupPage() {
  return (
    <>
      <p className="eyebrow">BIBLIARCH · NOTES</p>
      <h1>Create your account</h1>
      <p>One account for Notes and Books.</p>
      <AuthForm mode="signup" />
      <Link href="/login" className="switch-mode">Already have an account? Log in</Link>
    </>
  );
}
