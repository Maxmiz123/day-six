const express = require("express");

const app = express();

var properties = new Array();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/", (req,res) => {
    console.log (req.headers);
    res.send("<p>Hello</p>");
});

app.get("/properties", (req, res) => {
    // var properties = new Array();
    // properties.push({
    //     id: 1,
    //     name: "One", 
    //     locations: "Lisbon"
    // });
    res.json(properties);
});

app.post("/properties", (req, res) => {
    const property = req.body;
    console.log(property);
    res.json(property);
});

app.listen(3000, (err) => {
    if (err) {
    console.log("Oops, error");
    return;
}   

    console.log ("Server listening port 3000");
})

console.log("This app runs! Yay");