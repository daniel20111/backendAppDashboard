const { Schema, model } = require("mongoose");

const DashboardSchema = new Schema({
	montoVentasAnual: {
		type: Number,
		default: 0,
		required: true,
	},
	montoVentasMensual: {
		type: Number,
		default: 0,
		required: true,
	},
	montoVentasDiario: {
		type: Number,
		default: 0,
		required: true,
	},
	montoVentasPorMesAnual: [
		{
			year: Number,
			month: Number,
			total: Number,
		},
	],
	sucursal: {
		type: Schema.Types.ObjectId,
		ref: "Sucursal",
		required: true,
		index: true, // Añadido índice para mejorar el rendimiento de las consultas
	},
	porcentajeMermasPorcentaje: {
		type: Number,
		default: 0,
		required: true,
		min: 0, // Validación: el valor mínimo es 0
		max: 100, // Validación: el valor máximo es 100
	},
	ordenesProcesadasPorcentaje: {
		type: Number,
		default: 0,
		required: true,
		min: 0,
		max: 100,
	},
	oportunidadesNegocioPorcentaje: {
		type: Number,
		default: 0,
		required: true,
		min: 0,
		max: 100,
	},
	// Añadido para metas de ventas
	metasDeVentas: {
		diario: Number,
		mensual: Number,
		anual: Number,
	},
});

module.exports = model("Dashboard", DashboardSchema);
