import { RoleBasedHeader } from "@/components/RoleBasedHeader";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { customAuth, AuthSession } from "@/lib/auth";
import { secureApi } from "@/lib/secure-api";
import { renderFormattedText } from "@/hooks/use-akhbar";
import { useAkhbar } from "@/hooks/use-akhbar";
import { SignedImage } from "@/components/SignedImage";
import { LogOut, GraduationCap, User, Newspaper, ChevronDown, ChevronUp, Users } from "lucide-react";

interface StudentData {
  id: string;
  full_name: string;
  grade: string;
}

interface ParentStudentLink {
  id: string;
  parent_id: string;
  student_id: string;
}

interface GradePeriod {
  id: string;
  title: string;
  grade: string;
}

interface PeriodGrade {
  id: string;
  period_id: string;
  subject: string;
  grade: string | null;
}

const SUBJECT_OPTIONS = [
  { value: "zaban", label: "زبان" }, { value: "riazi", label: "ریاضی" }, { value: "farsi", label: "فارسی" },
  { value: "dini", label: "دینی" }, { value: "quran", label: "قرآن" }, { value: "arabi", label: "عربی" },
  { value: "tafakor", label: "تفکر و سبک زندگی" }, { value: "fizik", label: "فیزیک" }, { value: "shimi", label: "شیمی" },
  { value: "zist", label: "زیست" },
];

const GRADE_OPTIONS = [
  { value: "7/1", label: "۷/۱" }, { value: "7/2", label: "۷/۲" }, { value: "7/3", label: "۷/۳" }, { value: "7/4", label: "۷/۴" },
  { value: "8/1", label: "۸/۱" }, { value: "8/2", label: "۸/۲" }, { value: "8/3", label: "۸/۳" }, { value: "8/4", label: "۸/۴" },
  { value: "9/1", label: "۹/۱" }, { value: "9/2", label: "۹/۲" }, { value: "9/3", label: "۹/۳" }, { value: "9/4", label: "۹/۴" },
];

const Parent = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [children, setChildren] = useState<StudentData[]>([]);
  const [selectedChild, setSelectedChild] = useState<StudentData | null>(null);
  const [gradePeriods, setGradePeriods] = useState<GradePeriod[]>([]);
  const [periodGrades, setPeriodGrades] = useState<PeriodGrade[]>([]);
  const [openPeriods, setOpenPeriods] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const validate = async () => {
      const localSession = customAuth.getSession();
      if (!localSession) { navigate("/login"); return; }
      const { valid, session: s } = await customAuth.validateSession();
      if (!valid || !s) { toast.error("لطفا دوباره وارد شوید"); navigate("/login"); return; }
      if (s.role !== "parent") { toast.error("دسترسی غیرمجاز"); navigate("/"); return; }
      setSession(s);
      
      // Get linked children
      const { data: links } = await secureApi.select<ParentStudentLink>('parent_students', { parent_id: s.user.id });
      if (links && links.length > 0) {
        const { data: students } = await secureApi.select<StudentData>('students');
        if (students) {
          const linkedStudents = students.filter(st => links.some(l => l.student_id === st.id));
          setChildren(linkedStudents);
          if (linkedStudents.length > 0) setSelectedChild(linkedStudents[0]);
        }
      }
      setLoading(false);
    };
    validate();
  }, [navigate]);

  useEffect(() => {
    if (selectedChild) {
      fetchGradePeriods(selectedChild.grade);
      fetchPeriodGrades(selectedChild.id);
    }
  }, [selectedChild]);

  const { akhbarList } = useAkhbar({ filterByGrade: selectedChild?.grade, onlyPublished: true });

  const fetchGradePeriods = async (grade: string) => {
    const { data } = await secureApi.select<GradePeriod>('grade_periods', { grade });
    if (data) setGradePeriods(data);
  };

  const fetchPeriodGrades = async (studentId: string) => {
    const { data } = await secureApi.select<PeriodGrade>('student_period_grades', { student_id: studentId });
    if (data) setPeriodGrades(data);
  };

  const getSubjectLabel = (s: string) => SUBJECT_OPTIONS.find(o => o.value === s)?.label || s;
  const getGradeLabel = (g: string) => GRADE_OPTIONS.find(o => o.value === g)?.label || g;
  const getGradeForPeriodSubject = (periodId: string, subject: string) => periodGrades.find(g => g.period_id === periodId && g.subject === subject)?.grade || "---";
  const togglePeriod = (id: string) => setOpenPeriods(prev => ({ ...prev, [id]: !prev[id] }));

  const handleLogout = () => { customAuth.logout(); navigate("/login"); };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedHeader />
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-4xl" dir="rtl">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold flex items-center gap-3"><Users className="w-8 h-8 text-primary" /> پنل والدین</h1>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all">
              <LogOut className="w-4 h-4" /><span>خروج</span>
            </button>
          </div>

          {children.length === 0 ? (
            <Card className="p-12 text-center border-2">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground text-lg">هیچ فرزندی به حساب شما متصل نشده است</p>
              <p className="text-sm text-muted-foreground mt-2">لطفا با مدیریت مدرسه تماس بگیرید</p>
            </Card>
          ) : (
            <>
              {/* Child selector */}
              {children.length > 1 && (
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                  {children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedChild(child)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                        selectedChild?.id === child.id ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span>{child.full_name}</span>
                      <span className="text-xs opacity-75">{getGradeLabel(child.grade)}</span>
                    </button>
                  ))}
                </div>
              )}

              {selectedChild && (
                <div className="space-y-8">
                  {/* Student Info */}
                  <Card className="p-6 border-2">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-7 h-7 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold">{selectedChild.full_name}</h2>
                        <p className="text-muted-foreground">پایه: {getGradeLabel(selectedChild.grade)}</p>
                      </div>
                    </div>
                  </Card>

                  {/* Grades */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><GraduationCap className="w-6 h-6 text-primary" /> نمرات</h2>
                    {gradePeriods.length === 0 ? (
                      <Card className="p-8 text-center border-2"><p className="text-muted-foreground">نمره‌ای ثبت نشده است</p></Card>
                    ) : (
                      gradePeriods.map(period => (
                        <Collapsible key={period.id} open={openPeriods[period.id]} onOpenChange={() => togglePeriod(period.id)}>
                          <Card className="border-2 overflow-hidden">
                            <CollapsibleTrigger asChild>
                              <button className="w-full flex items-center justify-between p-5 hover:bg-muted/50 transition-all">
                                <span className="text-lg font-bold">{period.title}</span>
                                {openPeriods[period.id] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 p-5 pt-0">
                                {SUBJECT_OPTIONS.map(subject => {
                                  const grade = getGradeForPeriodSubject(period.id, subject.value);
                                  return (
                                    <div key={subject.value} className="p-4 bg-muted/50 rounded-lg border border-border text-center">
                                      <p className="text-xs text-muted-foreground mb-2">{subject.label}</p>
                                      <p className={`text-xl font-bold ${grade === "---" ? "text-muted-foreground" : "text-primary"}`}>{grade}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </Card>
                        </Collapsible>
                      ))
                    )}
                  </div>

                  {/* News */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Newspaper className="w-6 h-6 text-primary" /> اخبار</h2>
                    {akhbarList.length === 0 ? (
                      <Card className="p-8 text-center border-2"><p className="text-muted-foreground">خبری وجود ندارد</p></Card>
                    ) : (
                      akhbarList.map(item => (
                        <Card key={item.id} className="p-6 border-2">
                          <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                          <p className="text-xs text-muted-foreground mb-4">{new Date(item.created_at).toLocaleDateString('fa-IR')}</p>
                          {item.image_url && <SignedImage bucket="profile-pictures" source={item.image_url} alt={item.title} className="w-full max-h-64 object-contain rounded-lg mb-4" />}
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">{renderFormattedText(item.content)}</div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Parent;