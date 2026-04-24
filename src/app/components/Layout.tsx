import { Outlet } from "react-router";
import { NavBar } from "./NavBar";

export function Layout() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] text-white">
      <div className="max-w-md mx-auto relative pb-20">
        <Outlet />
        <NavBar />
      </div>
    </div>
  );
}
