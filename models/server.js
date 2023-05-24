const express = require("express");
const cors = require("cors");
const fileUpload = require("express-fileupload");

const { dbConnection } = require("../database/config");

class Server {
	constructor() {
		this.app = express();
		this.port = process.env.PORT;

		this.paths = {
			auth: "/api/auth",
			buscar: "/api/buscar",
			categorias: "/api/categorias",
			productos: "/api/productos",
			usuarios: "/api/usuarios",
			uploads: "/api/uploads",
			entradas: "/api/entradas",
			salidas: "/api/salidas",
			traspasos: "/api/traspasos",
			movimientos: "/api/movimientos",
			sucursales: "/api/sucursales",
			cotizaciones: "/api/cotizaciones",
			stocks: "/api/stocks",
			ventas: "/api/ventas",
		};

		// Conectar a base de datos
		this.conectarDB();

		// Middlewares
		this.middlewares();

		// Rutas de mi aplicación
		this.routes();
	}

	async conectarDB() {
		await dbConnection();
	}

	middlewares() {
		// CORS
		this.app.use(cors());

		// Lectura y parseo del body
		this.app.use(express.json());

		// Directorio Público
		this.app.use(express.static("public"));

		// Fileupload - Carga de archivos
		this.app.use(
			fileUpload({
				useTempFiles: true,
				tempFileDir: "/tmp/",
				createParentPath: true,
			})
		);
	}

	routes() {
		this.app.use(this.paths.auth, require("../routes/auth"));
		this.app.use(this.paths.buscar, require("../routes/buscar"));
		this.app.use(this.paths.categorias, require("../routes/categorias"));
		this.app.use(this.paths.productos, require("../routes/productos"));
		this.app.use(this.paths.usuarios, require("../routes/usuarios"));
		this.app.use(this.paths.uploads, require("../routes/uploads"));
		this.app.use(this.paths.entradas, require("../routes/entradas"));
		this.app.use(this.paths.salidas, require("../routes/salidas"));
		this.app.use(this.paths.traspasos, require("../routes/traspasos"));
		this.app.use(this.paths.movimientos, require("../routes/movimientos"));
		this.app.use(this.paths.sucursales, require("../routes/sucursales"));
		this.app.use(this.paths.cotizaciones, require("../routes/cotizaciones"));
		this.app.use(this.paths.stocks, require("../routes/stocks"));
		this.app.use(this.paths.ventas, require("../routes/ventas"));
	}

	listen() {
		this.app.listen(this.port, () => {
			console.log("Servidor corriendo en puerto", this.port);
		});
	}
}

module.exports = Server;
