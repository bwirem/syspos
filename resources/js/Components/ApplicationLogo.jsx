export default function ApplicationLogo(props) {
    return (
        <img
            {...props}
            src="/img/poslogo.png"  /* Make sure the path is correct! */
            alt="Application Logo"
            className="w-8 h-8 mr-2"
        />
    );
}

