import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const CORS_JSON: Record<string, string> = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, X-Access-Token",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS_JSON });
}

function getSupabaseUrl(): string {
  return Deno.env.get("SUPABASE_URL") ?? "";
}

function getServiceRoleKey(): string {
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

function getAnonKey(): string {
  return Deno.env.get("SUPABASE_ANON_KEY") ??
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    "";
}

const initializeStorage = async () => {
  try {
    const supabase = createClient(
      getSupabaseUrl(),
      getServiceRoleKey(),
    );
    const bucketName = "make-e44554cb-profile-photos";
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((bucket) => bucket.name === bucketName);
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 5242880,
      });
      console.log(`Created storage bucket: ${bucketName}`);
    }
  } catch (error) {
    console.log(`Storage initialization error: ${error}`);
  }
};

initializeStorage().catch((err) => console.log("Storage init failed:", err));

async function getUserFromToken(accessToken: string | undefined) {
  if (!accessToken) return null;
  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getServiceRoleKey() || getAnonKey();
    if (!supabaseUrl || !supabaseKey) {
      console.log("Missing SUPABASE_URL or API key for getUserFromToken");
      return null;
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseKey,
    );
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);
    if (error) {
      console.log(`Auth error: ${error.message}`);
      return null;
    }
    return user;
  } catch (error) {
    console.log(`getUserFromToken error: ${error}`);
    return null;
  }
}

function accessTokenFromHeaders(h: Headers): string | undefined {
  const x = h.get("X-Access-Token");
  if (x) return x;
  const auth = h.get("Authorization");
  if (auth?.startsWith("Bearer ")) {
    const t = auth.slice(7).trim();
    if (t.startsWith("eyJ")) return t;
  }
  return undefined;
}

function normalizePathname(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("make-server-e44554cb");
  if (idx < 0) {
    return pathname.startsWith("/") ? pathname : `/${pathname}`;
  }
  const tail = parts.slice(idx + 1);
  return tail.length ? `/${tail.join("/")}` : "/";
}

/** Beat RPC at function root — works no matter what path the gateway uses */
async function handleBeatRpc(
  headers: Headers,
  body: Record<string, unknown>,
): Promise<Response> {
  const rpc = body._rpc as string;
  const accessToken = accessTokenFromHeaders(headers);
  const user = await getUserFromToken(accessToken);

  if (rpc === "saveBeat") {
    if (!user) return jsonRes({ error: "Unauthorized" }, 401);
    const beatName = body.beatName as string;
    const pattern = body.pattern;
    const tempo = body.tempo as number;
    if (!beatName || pattern == null) {
      return jsonRes({ error: "Beat name and pattern are required" }, 400);
    }
    try {
      const beatId = `beat_${user.id}_${Date.now()}`;
      const beatData = {
        id: beatId,
        userId: user.id,
        name: beatName,
        pattern,
        tempo,
        createdAt: new Date().toISOString(),
      };
      await kv.set(beatId, beatData);
      return jsonRes({ success: true, beatId });
    } catch (e: any) {
      console.log(`saveBeat rpc: ${e}`);
      return jsonRes({ error: `Failed to save beat: ${e?.message || e}` }, 500);
    }
  }

  if (rpc === "listBeats") {
    if (!user) return jsonRes({ error: "Unauthorized" }, 401);
    try {
      const allBeats = await kv.getByPrefix(`beat_${user.id}_`);
      return jsonRes({ beats: allBeats });
    } catch (e) {
      console.log(`listBeats rpc: ${e}`);
      return jsonRes({ error: "Failed to retrieve beats" }, 500);
    }
  }

  if (rpc === "deleteBeat") {
    if (!user) return jsonRes({ error: "Unauthorized" }, 401);
    const beatId = body.beatId as string;
    if (!beatId?.startsWith(`beat_${user.id}_`)) {
      return jsonRes({ error: "Unauthorized to delete this beat" }, 403);
    }
    try {
      await kv.del(beatId);
      return jsonRes({ success: true });
    } catch (e) {
      console.log(`deleteBeat rpc: ${e}`);
      return jsonRes({ error: "Failed to delete beat" }, 500);
    }
  }

  return jsonRes({ error: "Unknown _rpc", rpc }, 400);
}

const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey","X-Access-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }
    const supabase = createClient(
      getSupabaseUrl(),
      getServiceRoleKey(),
    );
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || "" },
      email_confirm: true,
    });
    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }
    return c.json({ user: data.user });
  } catch (error) {
    console.log(`Signup exception: ${error}`);
    return c.json({ error: "Failed to create account" }, 500);
  }
});

app.post("/beats/save", async (c) => {
  try {
    const accessToken = c.req.header("X-Access-Token") ||
      (c.req.header("Authorization")?.startsWith("Bearer ") &&
        c.req.header("Authorization")!.split(" ")[1].startsWith("eyJ")
        ? c.req.header("Authorization")!.split(" ")[1]
        : undefined);
    const user = await getUserFromToken(accessToken);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { beatName, pattern, tempo } = await c.req.json();
    if (!beatName || !pattern) {
      return c.json({ error: "Beat name and pattern are required" }, 400);
    }
    const beatId = `beat_${user.id}_${Date.now()}`;
    await kv.set(beatId, {
      id: beatId,
      userId: user.id,
      name: beatName,
      pattern,
      tempo,
      createdAt: new Date().toISOString(),
    });
    return c.json({ success: true, beatId });
  } catch (error: any) {
    console.log(`Save beat exception: ${error}`);
    return c.json({ error: `Failed to save beat: ${error?.message || error}` }, 500);
  }
});

app.get("/beats", async (c) => {
  try {
    const accessToken = c.req.header("X-Access-Token") ||
      (c.req.header("Authorization")?.startsWith("Bearer eyJ")
        ? c.req.header("Authorization")!.split(" ")[1]
        : undefined);
    const user = await getUserFromToken(accessToken);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const allBeats = await kv.getByPrefix(`beat_${user.id}_`);
    return c.json({ beats: allBeats });
  } catch (error) {
    console.log(`Get beats error: ${error}`);
    return c.json({ error: "Failed to retrieve beats" }, 500);
  }
});

app.delete("/beats/:beatId", async (c) => {
  try {
    const accessToken = c.req.header("X-Access-Token") ||
      (c.req.header("Authorization")?.startsWith("Bearer eyJ")
        ? c.req.header("Authorization")!.split(" ")[1]
        : undefined);
    const beatId = c.req.param("beatId");
    const user = await getUserFromToken(accessToken);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    if (!beatId.startsWith(`beat_${user.id}_`)) {
      return c.json({ error: "Unauthorized to delete this beat" }, 403);
    }
    await kv.del(beatId);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Delete beat error: ${error}`);
    return c.json({ error: "Failed to delete beat" }, 500);
  }
});

app.get("/test-auth", async (c) => {
  const h = new Headers();
  const xa = c.req.header("X-Access-Token");
  const auth = c.req.header("Authorization");
  if (xa) h.set("x-access-token", xa);
  if (auth) h.set("authorization", auth);
  const accessToken = accessTokenFromHeaders(h);
  return c.json({
    message: "Test endpoint reached!",
    hasToken: !!accessToken,
    tokenLength: accessToken?.length,
  });
});

app.post("/profile/photo", async (c) => {
  try {
    const accessToken = c.req.header("X-Access-Token") ||
      (c.req.header("Authorization")?.split(" ")[1]?.startsWith("eyJ")
        ? c.req.header("Authorization")!.split(" ")[1]
        : undefined);
    const user = await getUserFromToken(accessToken);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const { photo, contentType } = await c.req.json();
    if (!photo || !contentType) {
      return c.json({ error: "Photo and content type are required" }, 400);
    }
    if (!contentType.startsWith("image/")) {
      return c.json({ error: "File must be an image" }, 400);
    }
    const binaryString = atob(photo);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    if (bytes.length > 5242880) {
      return c.json({ error: "File size must be less than 5MB" }, 400);
    }
    const bucketName = "make-e44554cb-profile-photos";
    const fileName = `${user.id}_${Date.now()}.${contentType.split("/")[1]}`;
    const supabase = createClient(
      getSupabaseUrl(),
      getServiceRoleKey(),
    );
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, bytes, { contentType, upsert: true });
    if (uploadError) {
      return c.json({ error: uploadError.message }, 500);
    }
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 31536000);
    if (urlError) return c.json({ error: urlError.message }, 500);
    const photoUrl = signedUrlData.signedUrl;
    await kv.set(`profile_photo_${user.id}`, { photoUrl });
    return c.json({ success: true, photoUrl });
  } catch (error: any) {
    console.log(`Upload profile photo exception: ${error}`);
    return c.json({ error: `Failed to upload photo: ${error?.message || error}` }, 500);
  }
});

app.get("/profile/photo", async (c) => {
  try {
    const accessToken = c.req.header("X-Access-Token") ||
      (c.req.header("Authorization")?.split(" ")[1]?.startsWith("eyJ")
        ? c.req.header("Authorization")!.split(" ")[1]
        : undefined);
    const user = await getUserFromToken(accessToken);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const photoData = await kv.get(`profile_photo_${user.id}`);
    if (!photoData) return c.json({ photoUrl: null });
    return c.json({ photoUrl: photoData.photoUrl });
  } catch (error) {
    console.log(`Get profile photo error: ${error}`);
    return c.json({ error: "Failed to retrieve photo" }, 500);
  }
});

app.notFound((c) =>
  c.json(
    {
      error: "Not found",
      path: c.req.path,
      method: c.req.method,
    },
    404,
  ),
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey,X-Access-Token",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      },
    });
  }

  if (req.method === "POST") {
    const raw = await req.text();
    let payload: Record<string, unknown> = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      /* not JSON, forward to Hono */
    }

    const rpc = payload._rpc as string | undefined;
    if (rpc === "saveBeat" || rpc === "listBeats" || rpc === "deleteBeat") {
      return handleBeatRpc(req.headers, payload);
    }

    const u = new URL(req.url);
    const path = normalizePathname(u.pathname);
    const inner = new Request(`http://edge${path}${u.search}`, {
      method: req.method,
      headers: req.headers,
      body: raw,
    });
    return app.fetch(inner);
  }

  const u = new URL(req.url);
  const path = normalizePathname(u.pathname);
  const init: RequestInit = {
    method: req.method,
    headers: req.headers,
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    (init as { duplex?: string }).duplex = "half";
  }
  return app.fetch(new Request(`http://edge${path}${u.search}`, init));
});
