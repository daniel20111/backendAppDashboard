const { Schema, model } = require("mongoose");

const PuntoVentaSchema = Schema({
	codigo: { type: Number, required: true },
	direccion: { type: String, required: true },
	// Puedes añadir más campos aquí si es necesario
});

const SucursalSchema = new Schema({
	categoria: {
		type: String,
		required: true,
		default: "SUCURSAL",
		enum: ["CASA MATRIZ", "SUCURSAL"],
	},
	municipio: {
		type: String,
		required: [true, "El municipio es obligatorio"],
	},
	direccion: {
		type: String,
		required: [true, "La direccion es obligatoria"],
		unique: true,
	},
	codigoSucursal: { type: Number, required: true },
	puntosDeVenta: [PuntoVentaSchema],
	estado: {
		type: Boolean,
		default: true,
		required: true,
	},
	telefono: {
		type: String,
	},
	usuario: {
		type: Schema.Types.ObjectId,
		ref: "Usuario",
		required: true,
	},
});

SucursalSchema.methods.toJSON = function () {
	const { __v, estado, ...data } = this.toObject();
	return data;
};

module.exports = model("Sucursal", SucursalSchema);
