
import Objective from '../models/objectiveModel.js';

class ObjectiveController {
    static async createObjective(req, res) {
        try {
            const { subjectId, code, description, period, covered } = req.body;
            const objective = new Objective({
                tenantId: req.user.tenantId,
                subjectId,
                code,
                description,
                period,
                covered
            });
            await objective.save();
            res.status(201).json(objective);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async getObjectives(req, res) {
        try {
            const { subjectId } = req.query;
            const query = { tenantId: req.user.tenantId };
            if (subjectId) query.subjectId = subjectId;

            const objectives = await Objective.find(query).sort({ code: 1 });
            res.status(200).json(objectives);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }

    static async updateObjective(req, res) {
        try {
            const objective = await Objective.findOneAndUpdate(
                { _id: req.params.id, tenantId: req.user.tenantId },
                req.body,
                { new: true }
            );
            if (!objective) return res.status(404).json({ message: 'Objetivo no encontrado' });
            res.status(200).json(objective);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }

    static async deleteObjective(req, res) {
        try {
            const objective = await Objective.findOneAndDelete({
                _id: req.params.id,
                tenantId: req.user.tenantId
            });
            if (!objective) return res.status(404).json({ message: 'Objetivo no encontrado' });
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default ObjectiveController;
