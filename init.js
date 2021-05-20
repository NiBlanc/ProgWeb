const {openDb} = require("./db")

const tablesNames = ["categories","posts","users","commentaries","pvotes","cvotes"]



async function createCategories(db){
  const insertRequest = await db.prepare("INSERT INTO categories(cat_name) VALUES(?)")
  const names = ["Catégorie 1", "Catégorie 2", "Catégorie 3"]
  return await Promise.all(names.map(cat => {
    return insertRequest.run(cat)
  }))
}

async function createCommentaries(db){
  const insertRequest = await db.prepare("INSERT INTO commentaries(p_id, content, com_date, author_id) VALUES(?, ?, ?, ?)")
  const comms = [{
    p_id: 1,
    content: "Excellent site pour faire des recherches!",
    com_date: "2021-05-15 12:00:00",
    author_id: 2
  }
  ]
  return await Promise.all(comms.map(commentary => {
    return insertRequest.run([commentary.p_id, commentary.content, commentary.com_date, commentary.author_id])
  }))
}

async function createPosts(db){
  const insertRequest = await db.prepare("INSERT INTO posts(name, content, category, post_date, author_id) VALUES(?, ?, ?, ?, ?)")
  const contents = [{
    name: "Vous connaissez google?",
    content: "https://google.fr",
    category: 1,
    post_date: "2021-05-15 12:00:00",
    author_id: 1
  },
    {
      name: "Second post de test",
      content: "Lorem lipsum, Lorem lipsum Lorem lipsum Lorem lipsum",
      category: 2,
      post_date: "2021-05-15 12:20:00",
      author_id: 1
    }
  ]
  return await Promise.all(contents.map(post => {
    return insertRequest.run([post.name, post.content, post.category, post.post_date, post.author_id])
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

async function createPVotes(db){
  const insertRequest = await db.prepare("INSERT INTO pvotes(post_id, user_id, vote) VALUES(?, ?, ?)")
  const pvotes = [{
    post_id: 1,
    user_id: 2,
    vote: 1
  } ]
  return await Promise.all(pvotes.map(pvote => {
    return insertRequest.run([pvote.post_id, pvote.user_id, pvote.vote])
  }))
}

async function createCVotes(db){
  const insertRequest = await db.prepare("INSERT INTO cvotes(comm_id, user_id, vote) VALUES(?, ?, ?)")
  const cvotes = [{
    comm_id: 1,
    user_id: 1,
    vote: 1
  } ]
  return await Promise.all(cvotes.map(cvote => {
    return insertRequest.run([cvote.comm_id, cvote.user_id, cvote.vote])
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
      post_date smalldatetime,
      author_id integer,
      votes integer DEFAULT 0,
      interactions integer DEFAULT 0,
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
      com_date smalldatetime,
      votes integer DEFAULT 0,
      FOREIGN KEY(p_id) REFERENCES categories(id),
      FOREIGN KEY(author_id) REFERENCES users(user_id)
    );
  `)
  
  const pvote = db.run(`
    CREATE TABLE pvotes (
      post_id integer,
      user_id integer,
      vote integer,
      FOREIGN KEY(post_id) REFERENCES posts(id),
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
  `)

  const cvote = db.run(`
    CREATE TABLE cvotes (
      comm_id integer,
      user_id integer,
      vote integer,
      FOREIGN KEY(comm_id) REFERENCES commentaries(com_id),
      FOREIGN KEY(user_id) REFERENCES users(user_id)
    );
  `)

  return await Promise.all([cat,post,user,commentary,pvote,cvote])
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
  await createPVotes(db)
  await createCVotes(db)
})()
