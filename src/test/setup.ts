import os from "node:os";
import path from "node:path";

process.env.DATABASE_URL = `file:${path.join(os.tmpdir(), `colorbox-ai-test-${process.pid}.db`)}`;
process.env.NEXT_PUBLIC_DEMO_MODE = "true";
