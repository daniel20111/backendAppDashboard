const { Schema, model } = require("mongoose");

const ClienteSchema = Schema({
	nombre: {
		type: String,
		required: [true, "El nombre es obligatorio"],
		trim: true,
	},
	nit: {
		type: String,
		trim: true,
		unique: true,
	},
	ci: {
		type: String,
		trim: true,
		unique: true,
	},
	direccion: {
		type: String,
		trim: true,
	},
	telefono: {
		type: String,
		trim: true,
	},
	correo: {
		type: String,
		trim: true,
		unique: true,
	},
	estado: {
		type: Boolean,
		default: true,
	},
});

ClienteSchema.methods.toJSON = function () {
	const { __v, ...data } = this.toObject();
	return data;
};

module.exports = model("Cliente", ClienteSchema);
