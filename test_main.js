
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
  const cpassword = req.body.cpassword

  const users = await db.all(`
  SELECT * FROM users 
  WHERE login=?
`,[username])

  const mail = await db.all(`
  SELECT * FROM users 
  WHERE email=?
  `,[email])

  if(username.length==0) {
    data = {
      errors: "Veuillez rentrer un username",
      logged: false
    }
  }

  else if(users.length>0) {
    data = {
      errors: "L'username existe déjà",
      logged: false
    }
  }

  else if (!email.match(/[a-z0-9_\-\.]+@[a-z0-9_\-\.]+\.[a-z]+/i)) {
    data = {
      errors: "L'email n'est pas valide",
      logged: false
    }
  }

  else if(email.length==0) {
    data = {
      errors: "Veuillez rentrer une adresse email",
      logged: false
    }
  }

  else if(mail.length>0) {
    data = {
      errors: "L'adresse email est déjà utilisée",
      logged: false
    }
  }

  else if(password!=cpassword) {
    data = {
      errors: "Les mots de passe ne correspondent pas",
      logged: false
    }
  }

  else if(password.length==0) {
    data = {
      errors: "Veuillez rentrer un mot de passe",
      logged: false
    }
  }

  else {
    const post = await db.run(`
    INSERT INTO users(login,password,email)
    VALUES(?, ?, ?)
    `,[username, password, email])
    console.log("Compte créé")
    req.session.logged = true
    res.redirect("/")
    return
  }
  res.render("sign_in",data)
})

//  Connexion

app.get('/login',(req, res) => {
  res.render('login', {logged: req.session.logged})
})

app.post('/login', async(req, res) => {
  console.log("Salut")
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
  console.log(req.session.logged)
  req.session.logged = false
  res.redirect(302,'/login')
})

//                      //
//       Accueil        //
//                      //

app.get('/:cat?', async (req, res) => {
  if(!req.session.logged){
    console.log("ALED")
    res.redirect(302,'/login')
    return
  }
  const db = await openDb()
  const categoryActive = req.params.cat ? req.params.cat : 'home'
  const categories = await db.all(`
    SELECT * FROM categories
  `)
  const categoryObjectActive = categories.find(({cat_id}) => cat_id.toString() === categoryActive)
  let posts = []
  if(categoryActive === "home"){
    posts = await db.all(`
    SELECT * FROM posts
    LEFT JOIN categories on categories.cat_id = posts.category
  `)
  } else {
    posts = await db.all(`
      SELECT * FROM posts
      LEFT JOIN categories on categories.cat_id = posts.category
      WHERE category = ?
  `, [categoryActive])
  }
  console.log(categories)
  res.render("home",{categories: categories, categoryActive: categoryObjectActive, posts: posts, logged: req.session.logged})
})

//                            //
//   Gestion des catégories   //
//                            //

app.get('/category/create', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  const db = await openDb()

  const categories = await db.all(`
    SELECT * FROM categories
  `)
  res.render("post-create",{categories: categories})
})

app.post('/category/create', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }

  const db = await openDb()
  const id = req.params.id
  const name = req.body.name
  const content = req.body.content
  const category = req.body.category
  const post = await db.run(`
    INSERT INTO posts(name,content,category)
    VALUES(?, ?, ?)
  `,[name, content, category])
  res.redirect("/post/" + post.lastID)
})

app.listen(port,  () => {
  console.log(`Example app listening at http://localhost:${port}`)
})