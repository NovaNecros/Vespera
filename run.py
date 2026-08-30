# Vespera/run.py

from flask import Flask

from app import create_app
from app.core.config import ServerSettings, Colors

app : Flask = create_app()

BANNER : str = f"""
  _                                 ____   ____          _     _        _  _   
 | |__   __ _ _ __  _ __  _   _    |___ \\ |___ \\    __ _| |__ (_)      / \\/ \\  
 | '_ \\ / _` | '_ \\| '_ \\| | | |     __) |  __) |  / _` | '_ \\| |      \\    /  
 | | | | (_| | |_) | |_) | |_| |    / __/  / __/  | (_| | |_) | |       \\  /   
 |_| |_|\\__,_| .__/| .__/ \\__, |   |_____||_____|  \\__,_|_.__/|_|        \\/    
             |_|   |_|    |___/                                    
"""

if __name__ == "__main__":
    print(f"\n{Colors.MAGENTA}{'='*75}{Colors.RESET}")
    print(f"{Colors.RED} VESPERA :: TURING PATTERN ENIGMA SYNTHESIZER{Colors.RESET}")
    print(f"{Colors.MAGENTA}{'='*75}{Colors.RESET}")
    print(f"[*] {Colors.CYAN}Listening on http://localhost:{ServerSettings.PORT}{Colors.RESET}")
    print(f"{Colors.MAGENTA}{BANNER}{Colors.RESET}")


    app.run(
         host  = ServerSettings.HOST,
         port  = ServerSettings.PORT,
         debug = ServerSettings.DEBUG
    )