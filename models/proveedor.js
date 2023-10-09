//modelo para proveedor
const { Schema, model } = require("mongoose");

const ProveedorSchema = new Schema({
	nombre: {
		type: String,
		required: [true, "El nombre es obligatorio"],
	},
	telefono: {
		type: String,
		required: [true, "El telefono es obligatorio"],
		unique: true,
	},
	correo: {
		type: String,
		required: [true, "El correo es obligatorio"],
		unique: true,
	},
	estado: {
		type: Boolean,
		default: true,
		required: true,
	},
});

ProveedorSchema.methods.toJSON = function () {
	const { __v, ...data } = this.toObject();
	return data;
};
module.exports = model("Proveedor", ProveedorSchema);
