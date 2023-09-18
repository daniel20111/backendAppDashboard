const { Schema, model } = require("mongoose");

const ClienteSchema = Schema({
	nombre: {
		type: String,
		required: [true, "El nombre es obligatorio"],
		trim: true,
	},
	nit: {
		type: String,
	},
	ci: {
		type: String,
	},

	codigoCliente: {
		type: String,
		required: true,
		unique: true,
	},
	estado: {
		type: Boolean,
		default: true,
	},
});

ClienteSchema.path("nit").validate(function (value) {
	// Si 'nit' está presente, entonces 'ci' no es requerido
	if (value) return true;
	// Si 'nit' no está presente, entonces 'ci' debe estar presente
	return this.ci != null;
}, "Al menos uno de los campos nit o ci debe estar presente");

ClienteSchema.path("ci").validate(function (value) {
	// Si 'ci' está presente, entonces 'nit' no es requerido
	if (value) return true;
	// Si 'ci' no está presente, entonces 'nit' debe estar presente
	return this.nit != null;
}, "Al menos uno de los campos nit o ci debe estar presente");

ClienteSchema.methods.toJSON = function () {
	const { __v, ...data } = this.toObject();
	return data;
};

module.exports = model("Cliente", ClienteSchema);
