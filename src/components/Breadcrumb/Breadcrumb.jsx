// src/components/Breadcrumb/Breadcrumb.jsx
import { Link } from 'react-router-dom';
import { FiChevronRight } from 'react-icons/fi'; // Using an icon for a cleaner look
import './Breadcrumb.css';

const Breadcrumb = ({ paths }) => {
    return (
        <nav className="breadcrumb-nav" aria-label="breadcrumb">
            <ol className="breadcrumb-list">
                {paths.map((path, index) => {
                    const isLast = index === paths.length - 1;
                    
                    return (
                        <li key={index} className="breadcrumb-item">
                            {isLast ? (
                                // The current page (Not clickable, bolder text)
                                <span className="breadcrumb-current" aria-current="page">
                                    {path.name}
                                </span>
                            ) : (
                                // Previous pages (Clickable links)
                                <>
                                    <Link to={path.url} className="breadcrumb-link">
                                        {path.name}
                                    </Link>
                                    <FiChevronRight className="breadcrumb-separator" />
                                </>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumb;