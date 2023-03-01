const { Schema, model } = require("mongoose");

const SucursalSchema = Schema({
	definicion: {
		type: String,
		required: [true, "La definicion es obligatoria"],
		unique: true,
	},
	categoria: {
		type: String,
		required: true,
		default: "SUCURSAL",
		enum: ["CASA MATRIZ", "SUCURSAL"],
	},
	direccion: {
		type: String,
		required: [true, "La direccion es obligatoria"],
		unique: true,
	},
	estado: {
		type: Boolean,
		default: true,
		required: true,
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
