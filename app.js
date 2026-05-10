const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const pool = require("./db");
const containerClient = require("./blob");

require("dotenv").config();

const app = express();

app.use(express.static("public"));

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
});

app.post("/submit", upload.single("ktp"), async (req, res) => {
  try {
    const { nama, email } = req.body;

    if (!req.file) {
      return res.status(400).send("File wajib diupload");
    }

    const extension = req.file.originalname.split(".").pop();

    const fileName = `${uuidv4()}.${extension}`;

    const blockBlobClient = containerClient.getBlockBlobClient(fileName);

    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: {
        blobContentType: req.file.mimetype,
      },
    });

    const fileUrl = blockBlobClient.url;

    const query = `
      INSERT INTO pelamar (nama, email, ktp_url)
      VALUES ($1, $2, $3)
    `;

    await pool.query(query, [nama, email, fileUrl]);

    res.send(`
<!DOCTYPE html>
<html>
<head>

  <title>Upload Berhasil</title>

  <style>

    body{
      font-family: Arial;
      background: linear-gradient(135deg, #0078d4, #00b4d8);

      min-height:100vh;

      display:flex;
      justify-content:center;
      align-items:center;
    }

    .card{
      background:white;

      padding:30px;

      border-radius:20px;

      width:400px;

      text-align:center;

      box-shadow:0 10px 30px rgba(0,0,0,0.2);
    }

    img{
      width:100%;
      border-radius:12px;
      margin-top:20px;
    }

    .success{
      font-size:70px;
    }

    h2{
      margin-top:10px;
      color:#222;
    }

    p{
      margin-top:10px;
      color:#555;
    }

    .btn{
      display:inline-block;

      margin-top:20px;

      padding:12px 20px;

      background:#0078d4;

      color:white;

      text-decoration:none;

      border-radius:10px;
    }

    .btn:hover{
      background:#005fa3;
    }

  </style>

</head>

<body>

  <div class="card">

    <div class="success">
      ✅
    </div>

    <h2>Upload Berhasil</h2>

    <p><b>Nama:</b> ${nama}</p>
    <p><b>Email:</b> ${email}</p>

    <img src="${fileUrl}" />

    <br>

    <a class="btn" href="${fileUrl}" target="_blank">
      Lihat File
    </a>

    <a class="btn" href="/">
      Kembali
    </a>

  </div>

</body>
</html>
`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Terjadi Error");
  }
});

app.listen(process.env.PORT, () => {
  console.log(`Server berjalan di port ${process.env.PORT}`);
});
