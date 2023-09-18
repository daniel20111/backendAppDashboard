const { Schema, model } = require("mongoose");

const UsuarioSchema = Schema({
	nombre: {
		type: String,
		required: [true, "El nombre es obligatorio"],
		trim: true,
	},
	apellido: {
		type: String,
		required: [true, "El apellido es obligatorio"],
		trim: true,
	},
	correo: {
		type: String,
		required: [true, "El correo es obligatorio"],
		unique: true,
		trim: true,
	},
	password: {
		type: String,
		required: [true, "La contraseña es obligatoria"],
	},
	img: {
		type: String,
		trim: true,
	},
	rol: {
		type: String,
		required: true,
		default: "Usuario",
		enum: ["Vendedor", "Supervisor", "Administrador", "Inventarios"],
	},
	estado: {
		type: Boolean,
		default: true,
	},
	google: {
		type: Boolean,
		default: false,
	},
	sucursal: {
		type: Schema.Types.ObjectId,
		ref: "Sucursal",
	},
	codigoPuntoVenta: {
		type: Number,
		default: 0, // Código del punto de venta dentro de la sucursal
	},
	codigoUsuario: {
		type: String,
		unique: true,
		required: true, // Código del usuario dentro de la sucursal
	},
});

UsuarioSchema.methods.toJSON = function () {
	const { __v, password, _id, codigoPuntoVenta, ...usuario } = this.toObject();
	usuario.uid = _id;
	return usuario;
};

module.exports = model("Usuario", UsuarioSchema);
