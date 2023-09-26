const { Schema, model } = require("mongoose");

const DashboardSchema = Schema({
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
    
    

});
