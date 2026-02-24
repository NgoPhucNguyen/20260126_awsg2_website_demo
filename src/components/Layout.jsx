import { Outlet } from "react-router-dom";
import Navbar from "./Navbar/Navbar";
import AnalyzeSkinBtn from "./AnalyzeSkinBtn/AnalyzeSkinBtn";
const Layout = () => {
    return (
        <main className="App">
            <div className="content">
            <Navbar />
                <Outlet /> {/* This is where Home, Admin, or Login will appear */}
            <AnalyzeSkinBtn /> 
            </div>
            {/* <Footer/> */} 
        </main>
    )
}

export default Layout;