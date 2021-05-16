
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

  else if(username.length<4) {
    data = {
      errors: "L'username doit contenir au moins 4 caractères",
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
  
  else if(password.length<6) {
    data = {
      errors: "Le mot de passe doit faire au moins 6 caractères",
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
  let users
  const db = await openDb()
  if (username.match(/[a-z0-9_\-\.]+@[a-z0-9_\-\.]+\.[a-z]+/i)) {
    users = await db.all(`
      SELECT * FROM users 
      WHERE email=?
    `,[username])
  }
  
  else{
    users = await db.all(`
      SELECT * FROM users 
      WHERE login=?
    `,[username])
  }


  if(users.length==0) {
    data = {
      errors: "Username ou email inconnu",
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
    req.session.name = users[0].login
    req.session.uid=users[0].user_id
    console.log(req.session.logged, req.session.name, req.session.uid)
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
  console.log(name)
  console.log(cat)
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
    const new_cat = await db.run(`
      INSERT INTO categories(cat_name)
      VALUES(?)
    `,[name])

    const category= await db.all(`
    SELECT * FROM categories 
    WHERE cat_name=?
  `,[name])
    console.log(category)
    res.redirect("/cat_"+category[0].cat_id)
    return
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
  const name = req.body.name
  const content = req.body.content
  console.log(req.body)
  cat_id=req.params.cat

  var date = new Date()
  newdate =date.toISOString().slice(0, 19).replace('T', ' ')      //Pour convertir date format JS en format SQL

  let data={}

  const dbpost = await db.all(`
  SELECT * FROM posts 
  WHERE name=?
`,[name])
  if(name==0) {
    data={
      errors: "Veuillez rentrer un nom à l'article"
    }
  }

  else if(dbpost.length>0) {
    data={
      errors: "Le nom de l'article est déjà utilisé"
    } 
  }

  else if(content==0) {
    data={
      errors: "Veuillez rentrer du texte"
    } 
  }

  else{
    const post = await db.run(`
      INSERT INTO posts(name,content,category,author_id,post_date)
      VALUES(?, ?, ?, ?, ?)
    `,[name, content, req.params.cat, req.session.uid, newdate])

    const posted = await db.all(`
      SELECT * FROM posts
      WHERE post_date = ?
    `, [newdate])
    res.redirect(posted[0].id, "/cat_"+ req.params.cat +"/post/" , {cat_id:cat_id})
    return
  }

  console.log(data)
  const categories = await db.all(`
    SELECT * FROM categories
  `)
  const cat = await db.all(`
  SELECT * FROM categories 
  WHERE cat_id=?
`,[req.params.cat])

  res.render("post-create",{cat_id: req.params.cat, cat_name:cat[0].cat_name, categories:categories, data})
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
    JOIN categories on categories.cat_id = posts.category
    JOIN users on users.user_id = posts.author_id
    WHERE id = ?
  `,[id])

  res.render("post",{post: post,categories: categories})
})

//Commenter un post
app.post('/cat_:cat?/post/:id/comment', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  console.log("Ici")
  console(req.body)
  const db = await openDb()
  const comment = req.body.comment
  cat_id=req.params.cat
  post_id=req.params.id

  var date = new Date()
  newdate =date.toISOString().slice(0, 19).replace('T', ' ')      //Pour convertir date format JS en format SQL

  let data={}
  
  if(comment.length==0) {
    data={
      errors: "Veuillez rentrer un commentaire"
    } 
  }

  else{
    const post = await db.run(`
      INSERT INTO posts(content,p_id,author_id,com_date)
      VALUES(?, ?, ?, ?)
    `,[content, post_id, req.session.uid, newdate])

    res.redirect(post_id, "/cat_"+ req.params.cat +"/post/" , {cat_id:cat_id})
    return
  }

  console.log(data)
  const categories = await db.all(`
    SELECT * FROM categories
  `)
  const cat = await db.all(`
  SELECT * FROM categories 
  WHERE cat_id=?
`,[req.params.cat])

  res.render("post",{cat_id: req.params.cat, cat_name:cat[0].cat_name, categories:categories, data})
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