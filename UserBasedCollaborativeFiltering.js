//npm install underscore


const MongoClient = require('mongodb').MongoClient;
const _ = require('underscore');

// MongoDB veritabanı URL'si
const url = 'mongodb://localhost:27017';

// Veritabanı adı
const dbName = 'book_recommendations';

// Kullanıcılar ve kitaplar koleksiyonları
const usersCollection = 'users';
const booksCollection = 'books';

// MongoDB istemcisini oluşturun
MongoClient.connect(url, function(err, client) {
  if (err) throw err;

  // Veritabanı nesnesini alın
  const db = client.db(dbName);

  // Kullanıcılar ve kitaplar koleksiyonlarına erişin
  const users = db.collection(usersCollection);
  const books = db.collection(booksCollection);

  // Kullanıcılar ve kitaplar listelerini alın
  const all_users = [];
  const all_books = [];

  users.distinct('user_id', function(err, user_ids) {
    if (err) throw err;

    all_users.push.apply(all_users, user_ids);

    books.distinct('book_id', function(err, book_ids) {
      if (err) throw err;

      all_books.push.apply(all_books, book_ids);

      // Kullanıcılar ve kitaplar arasındaki benzerlik puanlarını hesaplayın
      const recommendations = {};

      for (let i = 0; i < all_users.length; i++) {
        const user = all_users[i];

        const user_items = [];

        books.find({user_id: user}).forEach(function(book) {
          user_items.push(book.book_id);
        }, function(err) {
          if (err) throw err;

          const scores = [];

          for (let j = 0; j < all_books.length; j++) {
            const item = all_books[j];

            if (user_items.includes(item)) {
              continue;
            }

            let similarity = 0;

            const other_users = [];

            books.find({book_id: item}).forEach(function(book) {
              other_users.push(book.user_id);
            }, function(err) {
              if (err) throw err;

              const overlap = _.intersection(user_items, other_users);

              const other_user_items = [];

              books.find({user_id: {$in: other_users}}).forEach(function(book) {
                other_user_items.push(book.book_id);
              }, function(err) {
                if (err) throw err;

                const union = _.union(user_items, other_user_items);

                if (overlap.length > 0) {
                  similarity += overlap.length / union.length;
                }
              });
            });

            if (similarity > 0) {
              scores.push({item: item, score: similarity});
            }
          }

          // Kitapların benzerlik puanlarına göre sıralanması
          scores.sort(function(a, b) {
            return b.score - a.score;
          });

          // En yüksek benzerlik puanına sahip kitapları kullanıcıya önerin
          const recommendations_for_user = _.map(scores.slice(0, 5), function(item) {
            return item.item;
          });

          recommendations[user] = recommendations_for_user;
        });
      }

      console.log(recommendations);

      // Veritabanı bağlantısını kapatın
      client.close();
    });
  });
});
