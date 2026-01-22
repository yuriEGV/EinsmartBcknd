import Evaluation from '../models/evaluationModel.js';

class EvaluationController {
    // Create a new evaluation
    static async createEvaluation(req, res) {
        try {
            const evaluation = new Evaluation({
                ...req.body,
                tenantId: req.user.tenantId
            });
            await evaluation.save();
            await evaluation.populate('courseId', 'name code');
            res.status(201).json(evaluation);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    // Get all evaluations (Secure)
    static async getEvaluations(req, res) {
        try {
            const query = (req.user.role === 'admin')
                ? {}
                : { tenantId: req.user.tenantId };

            const evaluations = await Evaluation.find(query)
                .populate('courseId', 'name code');
            res.status(200).json(evaluations);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get evaluations by course (Secure)
    static async getEvaluationsByCourse(req, res) {
        try {
            const evaluations = await Evaluation.find({
                courseId: req.params.courseId,
                tenantId: req.user.tenantId
            })
                .populate('courseId', 'name code');
            res.status(200).json(evaluations);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get evaluations by tenant (Secure)
    static async getEvaluationsByTenant(req, res) {
        try {
            const targetTenant = req.params.tenantId;
            if (req.user.role !== 'admin' && req.user.tenantId !== targetTenant) {
                return res.status(403).json({ message: 'Acceso denegado' });
            }

            const evaluations = await Evaluation.find({ tenantId: targetTenant })
                .populate('courseId', 'name code');
            res.status(200).json(evaluations);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Get a single evaluation by ID (Secure)
    static async getEvaluationById(req, res) {
        try {
            const evaluation = await Evaluation.findOne({
                _id: req.params.id,
                tenantId: req.user.tenantId
            })
                .populate('courseId', 'name code');
            if (!evaluation) {
                return res.status(404).json({ message: 'Evaluación no encontrada' });
            }
            res.status(200).json(evaluation);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    // Update an evaluation by ID (Secure)
    static async updateEvaluation(req, res) {
        try {
            const evaluation = await Evaluation.findOneAndUpdate(
                { _id: req.params.id, tenantId: req.user.tenantId },
                req.body,
                { new: true }
            )
                .populate('courseId', 'name code');
            if (!evaluation) {
                return res.status(404).json({ message: 'Evaluación no encontrada' });
            }
            res.status(200).json(evaluation);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    // Delete an evaluation by ID (Secure)
    static async deleteEvaluation(req, res) {
        try {
            const evaluation = await Evaluation.findOneAndDelete({
                _id: req.params.id,
                tenantId: req.user.tenantId
            });
            if (!evaluation) {
                return res.status(404).json({ message: 'Evaluación no encontrada' });
            }
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default EvaluationController;
