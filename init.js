const {openDb} = require("./db")

const tablesNames = ["categories","posts","users","commentaries"]



async function createCategories(db){
  const insertRequest = await db.prepare("INSERT INTO categories(cat_name) VALUES(?)")
  const names = ["Categorie 1", "Categorie 2"]
  return await Promise.all(names.map(cat => {
    return insertRequest.run(cat)
  }))
}

async function createCommentaries(db){
  const insertRequest = await db.prepare("INSERT INTO commentaries(p_id, content, author_id) VALUES(?, ?, ?)")
  const comms = [{
    p_id: 1,
    content: "Excellent site pour faire des recherches!",
    author_id: 2
  }
  ]
  return await Promise.all(comms.map(commentary => {
    return insertRequest.run([commentary.p_id, commentary.content, commentary.author_id])
  }))
}

async function createPosts(db){
  const insertRequest = await db.prepare("INSERT INTO posts(name, content, category, author_id) VALUES(?, ?, ?, ?)")
  const contents = [{
    name: "Article 1",
    content: "Lorem lipsum, Lorem lipsum Lorem lipsum Lorem lipsum",
    category: 1,
    author_id: 1
  },
    {
      name: "Article 2",
      content: "Lorem lipsum, Lorem lipsum Lorem lipsum Lorem lipsum",
      category: 2,
      author_id: 1
    }
  ]
  return await Promise.all(contents.map(post => {
    return insertRequest.run([post.name, post.content, post.category, post.author_id])
  }))
}

async function createUsers(db){
  const insertRequest = await db.prepare("INSERT INTO users(login, password, email) VALUES(?, ?, ?)")
  const usernames = [{
    login: "max",
    password: "max",
    email: "max@max.fr"
  },
    {
      login: "bob",
      password: "bob",
      email: "bob@bob.com"
    }
  ]
  return await Promise.all(usernames.map(user => {
    return insertRequest.run([user.login, user.password, user.email])
  }))
}



async function createTables(db){
  const cat = db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      cat_id integer PRIMARY KEY AUTOINCREMENT,
      cat_name varchar
    );
  `)

  const user = db.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id integer PRIMARY KEY AUTOINCREMENT,
      login varchar,
      password varchar,
      email varchar
    );
  `)

  const post = db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id integer PRIMARY KEY AUTOINCREMENT,
      name varchar,
      category integer,
      content text,
      post_date date,
      author_id integer,
      FOREIGN KEY(author_id) REFERENCES users(user_id),
      FOREIGN KEY(category) REFERENCES categories(cat_id)
    );
  `)

  const commentary = db.run(`
    CREATE TABLE IF NOT EXISTS commentaries (
      com_id integer PRIMARY KEY AUTOINCREMENT,
      p_id integer,
      content text,
      author_id integer,
      com_date date,
      FOREIGN KEY(p_id) REFERENCES categories(id),
      FOREIGN KEY(author_id) REFERENCES users(user_id)
    );
`)

  return await Promise.all([cat,post,user,commentary])
}


async function dropTables(db){
  return await Promise.all(tablesNames.map( tableName => {
      return db.run(`DROP TABLE IF EXISTS ${tableName}`)
    }
  ))
}

(async () => {
  // open the database
  let db = await openDb()
  await dropTables(db)
  await createTables(db)
  await createCategories(db)
  await createPosts(db)
  await createUsers(db)
  await createCommentaries(db)
})()
