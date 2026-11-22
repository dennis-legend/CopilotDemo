import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Pencil, Plus, Sparkles, Trash2, X } from "lucide-react";
import {
  createEmployeeSkill,
  deleteEmployeeSkill,
  getEmployeeSkills,
  updateEmployeeSkill,
} from "./api";
import type { EmployeeSkill, SkillProficiency } from "./types";

const PROFICIENCIES: SkillProficiency[] = ["Beginner", "Intermediate", "Advanced", "Expert"];

interface EmployeeSkillsProps {
  employeeId: number;
  token: string;
}

function EmployeeSkills({ employeeId, token }: EmployeeSkillsProps) {
  const [skills, setSkills] = useState<EmployeeSkill[]>([]);
  const [skillName, setSkillName] = useState("");
  const [proficiency, setProficiency] = useState<SkillProficiency>("Intermediate");
  const [editingSkillId, setEditingSkillId] = useState<number | null>(null);
  const [removingSkillId, setRemovingSkillId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadSkills = useCallback(async () => {
    setLoading(true);
    try {
      setSkills(await getEmployeeSkills(token, employeeId));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load employee skills.");
    } finally {
      setLoading(false);
    }
  }, [employeeId, token]);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  function resetForm() {
    setSkillName("");
    setProficiency("Intermediate");
    setEditingSkillId(null);
  }

  async function submitSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    const input = { skillName: skillName.trim(), proficiency };

    try {
      if (editingSkillId === null) {
        const created = await createEmployeeSkill(token, employeeId, input);
        setSkills((current) => [...current, created].sort((a, b) => a.SkillName.localeCompare(b.SkillName)));
      } else {
        const updated = await updateEmployeeSkill(token, employeeId, editingSkillId, input);
        setSkills((current) => current.map((skill) => skill.Id === updated.Id ? updated : skill)
          .sort((a, b) => a.SkillName.localeCompare(b.SkillName)));
      }
      resetForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this skill.");
    } finally {
      setSaving(false);
    }
  }

  async function removeSkill(skill: EmployeeSkill) {
    if (!window.confirm(`Remove ${skill.SkillName} from this employee?`)) return;
    setError("");
    setRemovingSkillId(skill.Id);
    try {
      await deleteEmployeeSkill(token, employeeId, skill.Id);
      setSkills((current) => current.filter((item) => item.Id !== skill.Id));
      if (editingSkillId === skill.Id) resetForm();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not remove this skill.");
    } finally {
      setRemovingSkillId(null);
    }
  }

  function editSkill(skill: EmployeeSkill) {
    setSkillName(skill.SkillName);
    setProficiency(skill.Proficiency);
    setEditingSkillId(skill.Id);
    setError("");
  }

  return (
    <section className="skills-panel" aria-labelledby="employee-skills-heading">
      <div className="skills-heading">
        <span className="skills-icon"><Sparkles size={16} /></span>
        <div>
          <h3 id="employee-skills-heading">Skills</h3>
          <p>Track this teammate’s strengths and expertise.</p>
        </div>
        {!loading && <span className="skills-count">{skills.length}</span>}
      </div>

      <form className="skill-form" onSubmit={submitSkill}>
        <div className="skill-form-fields">
          <label className="skill-field skill-name-field">
            <span>Skill</span>
            <input
              aria-label="Skill name"
              maxLength={100}
              onChange={(event) => setSkillName(event.target.value)}
              placeholder="e.g. Project management"
              required
              value={skillName}
            />
          </label>
          <label className="skill-field skill-level-field">
            <span>Proficiency</span>
            <select
              aria-label="Skill proficiency"
              onChange={(event) => setProficiency(event.target.value as SkillProficiency)}
              value={proficiency}
            >
              {PROFICIENCIES.map((level) => <option key={level} value={level}>{level}</option>)}
            </select>
          </label>
        </div>
        <div className="skill-form-actions">
          {editingSkillId !== null && (
            <button className="secondary-button skill-cancel" onClick={resetForm} type="button">
              <X size={14} /> Cancel
            </button>
          )}
          <button className="primary-button skill-submit" disabled={saving} type="submit">
            {editingSkillId === null ? <Plus size={15} /> : <Check size={15} />}
            {saving ? "Saving…" : editingSkillId === null ? "Add skill" : "Save changes"}
          </button>
        </div>
      </form>

      {error && <div className="skill-error" role="alert">{error}</div>}

      {loading ? (
        <div className="skills-state"><span className="loading-spinner" /> Loading skills…</div>
      ) : skills.length === 0 ? (
        <div className="skills-empty">No skills added yet. Add the first one above.</div>
      ) : (
        <ul className="skill-list">
          {skills.map((skill) => (
            <li className="skill-row" key={skill.Id}>
              <div className="skill-info">
                <strong>{skill.SkillName}</strong>
                <span className={`proficiency-badge proficiency-${skill.Proficiency.toLowerCase()}`}>{skill.Proficiency}</span>
              </div>
              <div className="skill-row-actions">
                <button
                  aria-label={`Edit ${skill.SkillName}`}
                  className="skill-icon-button"
                  onClick={() => editSkill(skill)}
                  type="button"
                >
                  <Pencil size={14} />
                </button>
                <button
                  aria-label={`Remove ${skill.SkillName}`}
                  className="skill-icon-button skill-remove"
                  disabled={removingSkillId === skill.Id}
                  onClick={() => void removeSkill(skill)}
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default EmployeeSkills;
