fetch("http://localhost:3000/api/products/ABC123XYZ/scans", {
  headers: {
    "X-Admin-Key": "6a9f7d2b1c8e4f93b7d1e0a5c6f8b2d4a9e7c3f1b5d8e6a2c4f9b7d1e3a8c6f2"
  }
})
.then(res => res.json())
.then(data => console.log(data));