G.A.B.U Demo

fixed assets management system.

The project will be divided strategically in deferent foulders which each of them will have his own functionallity, this foulders wil have rules and this rules should not be broken.
In conjunction with the folders there are the frameworks and languajes that this project will use and this frameworks are:

React: the project in the client side will be made by react components and it will use some of their hooks.
Next.js: Next will be used for server side rendering and manage the routing.
TailwindCSS: Most of the design will be made by tailwind, some styles for example for the scrollbar there is no other choice but to make it with css only
Redux: Redux will be used for the context.
Node.js: Node will controll the entire logic in the server side, and will be the in charge of connecting with the database
typescript: to make the code typed and have a better error managment.

Now here are the folders:

demo 
    |
    |-src --> This folder will contain th main project with the logic on the client and server side.
    |   |
    |    |-app --> this folder will contain the pages that will be part of the routing and the api folder.
    |    |    |
    |    |    |-api --> Here the client will make the connection with the server passing data throw back to front
    |    |
    |    |-components --> The UI componentes that will be part of the system will be placed here, this components will be client components if it is neccesary.
    |    |
    |    |-store --> The redux context with all the necesary slices will be here obligatory.
    |    |
    |    |-lib --> This folder is the one that will manage all the logic in the server like connecting to the database and manage the objects palced in the models
    |        |
    |        |-models --> The classes and interfaces that contain big part of the logic in the server
    |
    |-public/assets --> Here will be placed all the static assets (iamges, fonts, favicons).
