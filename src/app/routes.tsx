import { createBrowserRouter } from "react-router";
import { Home } from "./screens/Home";
import { Feed } from "./screens/Feed";
import { AccountabilityGroup } from "./screens/AccountabilityGroup";
import { Stats } from "./screens/Stats";
import { Notifications } from "./screens/Notifications";
import { Layout } from "./components/Layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: "feed", Component: Feed },
      { path: "group", Component: AccountabilityGroup },
      { path: "stats", Component: Stats },
      { path: "notifications", Component: Notifications },
    ],
  },
]);
