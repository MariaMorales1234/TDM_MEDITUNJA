import Navbar from "../components/Navabar/Navbar.jsx";
import Red from "../components/Red/Red.jsx";
import Services from "../components/Services/Services.jsx";
import Nfc from "../components/NFC/nfc.jsx";
import Footer from "../components/footer/Footer.jsx";

function LandingPage() {
    return (
        <div>
            <Navbar />
            <Red />
            <Services />
            <Nfc />
            <Footer />
        </div>
    );
}

export default LandingPage;