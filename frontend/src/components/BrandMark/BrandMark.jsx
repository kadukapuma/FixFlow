import fixflowMark from "../../assets/fixflow_mark.png";
import "./BrandMark.css";

function BrandMark({ size = 40 }) {
    return (
        <div className="brand-mark" style={{ width: size, height: size }}>
            <img src={fixflowMark} alt="FixFlow" className="brand-mark__img" />
        </div>
    );
}

export default BrandMark;
