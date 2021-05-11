
const express = require('express')
const {openDb} = require("./db")

const session = require('express-session')
const app = express()
const bodyParser = require('body-parser');
const path = require('path');
const SQLiteStore = require('connect-sqlite3')(session);
const port = 3000
const sess = {
  store: new SQLiteStore,
  secret: 'secret key',
  resave: true,
  rolling: true,
  cookie: {
    maxAge: 1000 * 3600//ms
  },
  saveUninitialized: true
}


if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}
app.use(session(sess))
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', './views_test');
app.set('view engine', 'jade');

//                      //
//       Accueil        //
//                      //

app.get('/',(req, res) => {
  res.render('home', {logged: req.session.logged})
})





//                      //
//  Gestion des comptes //
//                      //


// Création de compte

app.get('/sign_in',(req, res) => {
  res.render('sign_in', {logged: req.session.logged})
})

app.post('/sign_in',async (req, res) => {
  const db = await openDb()
  const username = req.body.username
  const email = req.body.email
  const password = req.body.password

  const users = await db.all(`
  SELECT * FROM users 
  WHERE login=?
`,[username])

  const mail = await db.all(`
  SELECT * FROM users 
  WHERE email=?
  `,[email])

  if(username.length==0) {
    console.log("Veuillez rentrer un username");
  }

  else if(users.length>0) {
    console.log("L'username existe déjà");
  }

  else if (!email.match(/[a-z0-9_\-\.]+@[a-z0-9_\-\.]+\.[a-z]+/i)) {
    console.log(email + " n'est pas une adresse valide");
  }

  else if(email.length==0) {
    console.log("Veuillez rentrer un email");
  }

  else if(mail.length>0) {
    console.log("Le mail est déjà utilisé");
  }

  else if(password.length==0) {
    console.log("Veuillez rentrer un mot de passe");
  }

  else {
    const post = await db.run(`
    INSERT INTO users(login,password,email)
    VALUES(?, ?, ?)
    `,[username, password, email])
    console.log("Compte créé")
    res.redirect("/")
    return
  }
  res.redirect("/sign_in")
})

//  Connexion

app.get('/login',(req, res) => {
  res.render('login', {logged: req.session.logged})
})

app.post('/login', async(req, res) => {
  const username = req.body.username
  const pw = req.body.password
  console.log({username})
  console.log({pw})

  let data={  
  }
  const db = await openDb()
  const users = await db.all(`
  SELECT * FROM users 
  WHERE login=?
`,[username])
  console.log(users)
  if(users.length==0) {
    data = {
      errors: "Username inconnu",
      logged: false
    }
  }
  else if(pw != users[0].password) {
    data = {
      errors: "Mot de passe incorrect",
      logged: false
    }
  }
  else {
    console.log("Authentification réussie")
    req.session.logged = true
    data = {
      success: "Vous êtes log",
      logged: true
    }
    res.redirect(302,'/')
    return
  }
  res.render('login',data)
})

app.post('/logout',(req, res) => {
  req.session.logged = false

  res.redirect(302,'/login')
})


app.listen(port,  () => {
  console.log(`Example app listening at http://localhost:${port}`)
})