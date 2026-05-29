import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../AuthContext";

export default function Home() {
  const { user } = useAuth();
  const [me, setMe] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get("/me")
      .then((r) => setMe(r.data))
      .catch((e) => setErr(e.message));
  }, []);

// -----------For Testing-----------------

  // const showToken = async () => {
  // const token = await user.getIdToken();
  // console.log(token);
  // await navigator.clipboard.writeText(token);
  // alert("Token copied to clipboard");};
// ---------------------------------------

  return (
    <div>
      <h1 className="text-4xl font-bold mb-2">Hello, Citizen</h1>
      <p className="text-muted mb-6">Signed in as {user?.email}</p>
      <div className="bg-white border border-outline rounded-lg p-6">
        <h2 className="font-semibold mb-2">Backend round-trip</h2>
        {err && <p className="text-error">{err}</p>}
        {me ? (
          <pre className="text-sm bg-surface-container p-3 rounded">
            {JSON.stringify(me, null, 2)}
          </pre>
        ) : (
          <p className="text-muted">Calling /me…</p>
        )}

// -----------For Testing-----------------
        {/*<button onClick={showToken}>Copy ID token</button>*/}
// ---------------------------------------

      </div>
    </div>

  );
}