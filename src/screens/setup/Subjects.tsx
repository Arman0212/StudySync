import { useState } from 'react';
import { useApp } from '../../state/store';
import type { Subject, Topic } from '../../domain/types';
import { diffDays, formatDate, formatDuration, formatTime } from '../../domain/dates';
import { topicPriority } from '../../scheduling/priority';
import { Button } from '../../ui/Button';
import { ConfirmDialog, Modal } from '../../ui/Modal';
import { Card, EmptyState, StatusPill, SubjectDot, Notice } from '../../ui/bits';
import { useToast } from '../../ui/Toast';
import { SubjectForm } from './SubjectForm';
import { TopicForm } from './TopicForm';

const LEVEL = { easy: 'Easy', moderate: 'Moderate', hard: 'Hard', low: 'Low', medium: 'Medium', high: 'High' } as const;

export function Subjects() {
  const { data, dispatch, now } = useApp();
  const toast = useToast();
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [addTopicFor, setAddTopicFor] = useState<Subject | null>(null);
  const [editTopic, setEditTopic] = useState<Topic | null>(null);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [deleteTopic, setDeleteTopic] = useState<Topic | null>(null);

  const sorted = [...data.subjects].sort((a, b) => (a.examDate < b.examDate ? -1 : a.examDate > b.examDate ? 1 : 0));

  return (
    <div className="stack">
      <Card title="Add a subject" icon="plus">
        <SubjectForm />
      </Card>
      {sorted.length === 0 ? (
        <EmptyState compact illustration="books" title="No subjects yet">Add your first subject above with its exam date, then add the topics you need to study.</EmptyState>
      ) : (
        sorted.map((s) => {
          const topics = data.topics.filter((t) => t.subjectId === s.id).sort((a, b) => a.order - b.order);
          const total = topics.reduce((t, x) => t + x.estimatedMinutes, 0);
          const days = diffDays(now.date, s.examDate);
          return (
            <Card
              key={s.id}
              title={
                <span className="subject-card-head">
                  <SubjectDot color={s.color} />
                  {s.name}
                  {s.priority === 'high' && <span className="tag">High priority</span>}
                </span>
              }
              actions={
                <>
                  <Button size="sm" variant="secondary" icon="plus" onClick={() => setAddTopicFor(s)}>Add topic</Button>
                  <Button size="sm" variant="ghost" icon="edit" onClick={() => setEditSubject(s)} aria-label={`Edit subject ${s.name}`}>Edit</Button>
                  <Button size="sm" variant="ghost" icon="trash" className="btn-danger-outline" onClick={() => setDeleteSubject(s)} aria-label={`Delete subject ${s.name}`}>Delete</Button>
                </>
              }
            >
              <p className="muted">
                Exam {formatDate(s.examDate, { year: true })}
                {s.examStart != null ? ` at ${formatTime(s.examStart)}` : ''} · {days < 0 ? 'already past' : days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`} · {topics.length} topic{topics.length === 1 ? '' : 's'}, {formatDuration(total)} estimated
              </p>
              {data.profile && s.examDate < data.profile.planStart && <Notice level="warning">This exam is before your plan start ({formatDate(data.profile.planStart)}), so nothing can be scheduled for it.</Notice>}
              {topics.length === 0 ? (
                <EmptyState compact illustration="sprout" title="No topics yet" action={<Button variant="primary" size="sm" icon="plus" onClick={() => setAddTopicFor(s)}>Add the first topic</Button>}>
                  Break {s.name} into topics so StudySync can plan sessions for each one.
                </EmptyState>
              ) : (
                <ul className="list" aria-label={`Topics in ${s.name}`}>
                  {topics.map((t) => (
                    <li key={t.id} className="list-item">
                      <div className="list-main">
                        <div>
                          <p className="list-title">{t.title}</p>
                          <p className="list-meta">
                            {formatDuration(t.estimatedMinutes)} · {LEVEL[t.difficulty]} · {LEVEL[t.importance]} importance · priority {topicPriority(t)}
                            {t.confidence != null ? ` · confidence ${t.confidence}/5` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="row">
                        <StatusPill status={t.status} kind="topic" />
                        <Button size="sm" variant="ghost" icon="edit" onClick={() => setEditTopic(t)} aria-label={`Edit topic ${t.title}`}>Edit</Button>
                        <Button size="sm" variant="ghost" icon="trash" className="btn-danger-outline" onClick={() => setDeleteTopic(t)} aria-label={`Delete topic ${t.title}`}>Delete</Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })
      )}

      {editSubject && (
        <Modal title={`Edit ${editSubject.name}`} onClose={() => setEditSubject(null)} size="wide">
          <SubjectForm subject={editSubject} onDone={() => setEditSubject(null)} />
        </Modal>
      )}
      {addTopicFor && (
        <Modal title={`Add a topic to ${addTopicFor.name}`} onClose={() => setAddTopicFor(null)} size="wide">
          <TopicForm subjectId={addTopicFor.id} />
          <p className="muted small" style={{ marginTop: 8 }}>You can add several topics in a row. Close this dialog when you’re done.</p>
        </Modal>
      )}
      {editTopic && (
        <Modal title={`Edit ${editTopic.title}`} onClose={() => setEditTopic(null)} size="wide">
          <TopicForm subjectId={editTopic.subjectId} topic={editTopic} onDone={() => setEditTopic(null)} />
        </Modal>
      )}
      {deleteSubject && (
        <ConfirmDialog
          title={`Delete ${deleteSubject.name}?`}
          message={<p>This removes the subject, its {data.topics.filter((t) => t.subjectId === deleteSubject.id).length} topic(s) and all of its study sessions. This can’t be undone.</p>}
          confirmLabel="Delete subject"
          destructive
          onCancel={() => setDeleteSubject(null)}
          onConfirm={() => {
            dispatch({ type: 'deleteSubject', id: deleteSubject.id });
            toast.show(`Deleted ${deleteSubject.name}`);
            setDeleteSubject(null);
          }}
        />
      )}
      {deleteTopic && (
        <ConfirmDialog
          title={`Delete “${deleteTopic.title}”?`}
          message={<p>This removes the topic and its study sessions. This can’t be undone.</p>}
          confirmLabel="Delete topic"
          destructive
          onCancel={() => setDeleteTopic(null)}
          onConfirm={() => {
            dispatch({ type: 'deleteTopic', id: deleteTopic.id });
            toast.show('Topic deleted');
            setDeleteTopic(null);
          }}
        />
      )}
    </div>
  );
}
