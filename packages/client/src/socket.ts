import { io } from "socket.io-client";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || "https://lifescale-office.fly.dev";

export const socket = io(SERVER_URL, { autoConnect: false });
