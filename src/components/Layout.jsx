import { Outlet } from "react-router-dom";
import Navbar from "./Navbar/Navbar";

const Layout = () => {
    return (
        <main className="App">
            <Navbar />
            <div className="content">
                <Outlet /> {/* This is where Home, Admin, or Login will appear */}
            </div>
        </main>
    )
}

export default Layout;