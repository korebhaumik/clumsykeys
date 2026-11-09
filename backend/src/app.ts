import { createApplication } from "./server";

const { httpServer } = createApplication();

const port = Number(process.env.PORT ?? 1440);
httpServer.listen(port, () => {
	console.log(`Listening on port ${port}`);
});
