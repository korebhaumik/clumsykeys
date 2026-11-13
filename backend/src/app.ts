import { createApplication } from "./server";
import { loadEnvironment, readSupabaseConfig } from "./config";
import { createSupabasePersistence } from "./persistence";

loadEnvironment();
const config = readSupabaseConfig(process.env);
const { httpServer } = createApplication({ persistence: config ? createSupabasePersistence(config) : undefined });

const port = Number(process.env.PORT ?? 1440);
httpServer.listen(port, () => {
	console.log(`Listening on port ${port}`);
});
