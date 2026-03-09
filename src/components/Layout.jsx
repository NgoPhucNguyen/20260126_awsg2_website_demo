import { Outlet } from "react-router-dom";
import Navbar from "@/components/Navbar/Navbar";

const Layout = () => {
    return (
        <main className="App">
            <div className="content">
            <Navbar />
                <Outlet /> {/* This is where Home, Admin, or Login will appear */}
            </div>
            {/* <Footer/> */} 
        </main>
    )
}

export default Layout;