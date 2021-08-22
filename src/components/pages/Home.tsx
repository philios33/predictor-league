import React from 'react';

export const getLogin = () : {token: string, username: string} | null => {
    const login = localStorage.getItem("login");
    if (login !== null) {
        const decoded = JSON.parse(login);
        return {
            token: decoded.token,
            username: decoded.username,
        }
    } else {
        return null;
    }
}

function Home() {    
    const login = getLogin();

    return (
        <div className="home">
            {login === null ? (
                <div className="content">
                    <p><strong>Geoff:</strong> “He went over to the website, but he's a "game player" so he needs a whatsapp link.”</p>
                    <p><strong>Martin:</strong> “Cheers <a target="_blank" href="https://www.youtube.com/watch?v=6gED9AeSBNc">Geoff!</a>”</p>
                </div>
            ) : (
                <div className="content">
                    <p><strong>Geoff:</strong> “He's logged in as <em>{login.username}</em>.”</p>
                    <p><strong>Martin:</strong> “Cheers <a target="_blank" href="https://www.youtube.com/watch?v=6gED9AeSBNc">Geoff!</a>”</p>
                </div>
            )}
            
        </div>
    );
}

export default Home;
