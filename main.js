
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

const authentification = {
  username: "username",
  password: "password"    // les identifiants à rentrer pour se connecter
}


if (app.get('env') === 'production') {
  app.set('trust proxy', 1) // trust first proxy
  sess.cookie.secure = true // serve secure cookies
}
app.use(session(sess))
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', './views');
app.set('view engine', 'jade');


const categories = [
  {id: 'home', name: 'Accueil', link:"/"},
  {id: 'cat1', name: 'Catégorie 1', link:"/cat1"},
  {id: 'cat2', name: 'Catégorie 2', link:"/cat2"}
]

app.get('/login',(req, res) => {
  res.render('login', {logged: req.session.logged})
})
//à compléter
app.post('/sign_in',(req, res) => {
  req.session.logged = false
  res.redirect(302,'/sign_in')
})

app.post('/login',(req, res) => {
  const username = req.body.username
  const password = req.body.password
  let data = {
  }
  if(
    username !== authentification.username ||
    password !== authentification.password
  ) {
    data = {
      errors: "Le login est incorret",
      logged: false
    }
  // else if(button === true)
  //  // si on appuie sur le bouton retour alors rediriger ici ?
  //)
  } else {
    req.session.logged = true
    data = {
      success: "Vous êtes log",
      logged: true
    }
    //res.redirect(302,'/') //redirige automatiquement vers l'accueil mais fonctionne pas
  }
  res.render('login',data)
})
app.post('/logout',(req, res) => {
  req.session.logged = false
  res.redirect(302,'/login')
})

app.get('/post/create', async (req, res) => {
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

app.post('/post/create', async (req, res) => {
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

app.get('/post/:id', async (req, res) => {
  const db = await openDb()
  const id = req.params.id
  const post = await db.get(`
    SELECT * FROM posts
    LEFT JOIN categories on categories.cat_id = posts.category
    WHERE id = ?
  `,[id])
  res.render("post",{post: post})
})

app.get('/post/:id/edit', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }

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
  res.render("post-edit",{post: post, categories: categories})
})

app.post('/post/:id/edit', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }

  const db = await openDb()
  const id = req.params.id
  const name = req.body.name
  const content = req.body.content
  const category = req.body.category

  await db.run(`
    UPDATE posts
    SET name = ?, content = ?, category = ?
    WHERE id = ?
  `,[name, content, category, id])
  res.redirect("/post/" + id)
})

app.post('/post/:id/delete', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }

  const db = await openDb()
  const id = req.params.id
  await db.run(`
    DELETE FROM posts
    WHERE id = ?
  `,[id])
  res.redirect("/")
})

app.get('/categories', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }

  const db = await openDb()
  const categories = await db.all(`
    SELECT * FROM categories
  `)
  res.render("categories", {categories})
})

app.get('/category/:id', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  const id = req.params.id
  const db = await openDb()
  const category = await db.get(`
    SELECT * FROM categories
    WHERE cat_id = ?
  `,[id])
  res.render("category-edit", {category})
})

app.post('/category/:id/edit', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  const name = req.body.name
  const id = req.params.id
  const db = await openDb()
  const category = await db.get(`
    UPDATE categories
    SET cat_name = ?
    WHERE cat_id = ?
  `,[name,id])
  res.redirect(302,'/categories')
})

app.post('/category/:id/delete', async (req, res) => {
  if(!req.session.logged){
    res.redirect(302,'/login')
    return
  }
  const id = req.params.id
  const db = await openDb()
  const category = await db.get(`
    DELETE FROM categories
    WHERE cat_id = ?
  `,[id])
  res.redirect(302,'/categories')
})


app.get('/:cat?', async (req, res) => {
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
  res.render("blog",{categories: categories, categoryActive: categoryObjectActive, posts: posts, logged: req.session.logged})
})

app.listen(port,  () => {
  console.log(`Example app listening at http://localhost:${port}`)
})