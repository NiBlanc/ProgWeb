
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

    const users = await db.all(`
    SELECT * FROM users 
    WHERE login=?
  `,[username])
    
    req.session.logged = true
    req.session.name = username
    req.session.uid=users[0].user_id

    res.redirect("/")
    return
  }
  res.render("sign_in",data)
})

//  Connexion

app.get('/login',(req, res) => {
  res.render('login')
})

app.post('/login', async(req, res) => {
  const username = req.body.username
  const pw = req.body.password

  let data={  
  }
  const db = await openDb()
  const users = await db.all(`
  SELECT * FROM users 
  WHERE login=?
`,[username])

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
    req.session.logged = true
    req.session.name = username
    req.session.uid=users[0].user_id

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

//                            //
//   Gestion des catégories   //
//                            //

//Création d'une catégorie

app.get('/category/create', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  const db = await openDb()

  const categories = await db.all(`
    SELECT * FROM categories
  `)
  res.render("cat-create",{categories: categories})
})

app.post('/category/create', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }

  const db = await openDb()
  const id = req.params.id
  const name = req.body.name

  const cat = await db.all(`
  SELECT * FROM categories 
  WHERE cat_name=?
`,[name])

  if(name.length==0){
    data = {
      errors: "Veuillez rentrer un nom pour la catégorie",
    }
  }

  else if(cat.length>0){
    data = {
      errors: "Ce nom est déjà utilisé",
    }
  }

  else{
  const post = await db.run(`
    INSERT INTO categories(cat_id,cat_name)
    VALUES(?, ?)
  `,[id, name])
  res.redirect("/")
  }
  res.render("cat-create",data)
})


//                      //
//  Création de posts   //
//                      //


app.get('/cat_:cat?/post/create', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }

  const db = await openDb()

  const categories = await db.all(`
  SELECT * FROM categories
`)

  const cat = await db.all(`
  SELECT * FROM categories 
  WHERE cat_id=?
`,[req.params.cat])

  res.render("post-create",{cat_id: req.params.cat, cat_name:cat[0].cat_name, categories:categories})
})

app.post('/cat_:cat?/post/create', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }

  const db = await openDb()
  const id = req.params.id
  const name = req.body.name
  const content = req.body.content
  cat_id=req.params.cat

  var date = new Date()
  newdate =date.toISOString().slice(0, 19).replace('T', ' ')      //Pour convertir date format JS en format SQL

  const post = await db.run(`
    INSERT INTO posts(name,content,category,author_id,post_date)
    VALUES(?, ?, ?, ?, ?)
  `,[name, content, req.params.cat, req.session.uid, newdate])
  res.redirect("/cat_"+ req.params.cat +"/post/" + post.lastID, {cat_id:cat_id})
})


//Affichage d'un unique post
app.get('/cat_:cat?/post/:id', async (req, res) => {
  const db = await openDb()
  const id = req.params.id

  const categories = await db.all(`
    SELECT * FROM categories
  `)

  const post = await db.get(`
    SELECT * FROM posts
    LEFT JOIN categories on categories.cat_id = posts.category
    WHERE id = ?
  `,[id])
  res.render("post",{post: post,categories: categories})
})


//         Accueil        //
//           et           //
//       Catégories       //


app.get('/', async (req, res) => {              //Page d'accueil du site
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  const db = await openDb()
  const categories = await db.all(`
    SELECT * FROM categories
  `)
  let posts = []
  posts = await db.all(`
    SELECT * FROM posts
    LEFT JOIN categories on categories.cat_id = posts.category
  `)

  res.render("home",{categories: categories, posts: posts, logged: req.session.logged})
})

app.get('/cat_:cat?', async (req, res) => {               //Page correspondant à une catégorie
  if(!req.session.logged){
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

  posts = await db.all(`
    SELECT * FROM posts
    LEFT JOIN categories on categories.cat_id = posts.category
    WHERE category = ?
  `, [categoryActive])
  console.log(posts)
  //res.render("categories", {logged: req.session.logged})
  res.render("cat",{categories: categories, categoryActive: categoryObjectActive, posts: posts, logged: req.session.logged, cat_id: req.params.cat})
})

app.listen(port,  () => {
  console.log(`Example app listening at http://localhost:${port}`)
})