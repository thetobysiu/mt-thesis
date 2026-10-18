import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page">
      <h1>Not found</h1>
      <p>This page does not exist. <Link className="link" href="/">Back to the start page</Link>.</p>
    </div>
  );
}
