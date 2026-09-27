# Vespera/run.py

from flask import Flask

from app import create_app
from app.core.config import ServerSettings

app : Flask = create_app()



def main() -> None:
    app.run(
         host  = ServerSettings.HOST,
         port  = ServerSettings.PORT,
         debug = ServerSettings.DEBUG
    )

if __name__ == "__main__":
    main()