import { io } from "socket.io-client";
import { serverUrl } from "../../services/server";
import { supabase } from "../../services/supabase";

const socket = io(serverUrl || undefined, { autoConnect: false, auth: callback => {
	if (!supabase) { callback({}); return; }
	void supabase.auth.getSession().then(({ data }) => callback(data.session ? { accessToken: data.session.access_token } : {}))
		.catch(() => callback({}));
} });

export default socket;
