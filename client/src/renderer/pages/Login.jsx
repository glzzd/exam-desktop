import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Monitor } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import bgImage from "@/assets/img/6896179.jpg";
import logo from "@/assets/img/008.png";
// import emblem from "@/assets/img/Emblem_of_Azerbaijan.png";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(username, password);

      if (result.success) {
        toast.success("Giriş uğurla tamamlandı");
        navigate("/");
      } else {
        toast.error(result.message || "Giriş zamanı xəta baş verdi");
      }
    } catch (err) {
      console.error(err);
      toast.error("Gözlənilməz xəta baş verdi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen lg:overflow-hidden bg-white">
      {/* Test Link for Exam Client */}
      <div className="absolute top-4 right-4 z-50">
        <Button 
          variant="outline" 
          size="sm" 
          className="text-slate-500 hover:text-blue-600 bg-white/80 backdrop-blur-sm"
          onClick={() => window.open('#/exam-client', '_self')}
        >
          <Monitor className="w-4 h-4 mr-2" />
          İmtahan Terminalı
        </Button>
      </div>
      

      <div className="hidden lg:block absolute inset-y-0 left-0 w-[70%] -ml-[15%] -mt-[35%] -mb-[25%] transform rotate-[-4.5deg] bg-blue-900/20 rounded-[100%] pointer-events-none"></div>

    
      <div className="hidden lg:block absolute inset-y-0 left-0 w-[70%] -ml-[15%] -mt-[25%] -mb-[20%] transform rotate-[-4.5deg] bg-blue-900 rounded-[100%] overflow-hidden shadow-2xl">
        
          <div className="absolute inset-0 z-0 transform rotate-[4.5deg] scale-110"> 
            <img 
                src={bgImage} 
                alt="Background" 
                className="w-full h-full object-cover opacity-20" 
            />
           
          </div>
      </div>


      <div className="relative z-10 w-full h-full flex">
          <div className="hidden lg:flex w-[60%] flex-col items-center justify-center text-white h-full p-12">
                <div className="absolute top-12 left-12">
                    <img src={logo} alt="Logo" className="h-16 object-contain" />
                </div>
                <div className="absolute bottom-12 left-12 max-w-2xl">
                    <h1 className="text-5xl font-bold tracking-tight mb-4 text-left">
                    Elektron<br />İmtahan Mərkəzi
                    </h1>
                    <p className="text-md text-blue-100 leading-relaxed font-light opacity-90 text-left">
                    Xüsusi Rabitə və İnformasiya Təhlükəsizliyi Dövlət Xidməti əməkdaşlarının
  bilik və bacarıqlarının obyektiv şəkildə yoxlanılması və qiymətləndirilməsi
  üçün nəzərdə tutulmuş elektron imtahan mərkəzi sistemi
                    </p>
                </div>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12">
            <div className="w-full max-w-[400px]">
          <div className="mb-10 tracking-tight text-center">
            {/* <div className="flex justify-center mb-6">
                <img src={emblem} alt="Emblem" className="h-24 w-24 object-contain drop-shadow-md" />
            </div> */}
            <h2 className="text-3xl font-bold text-gray-800">
              Xoş gəlmişsiniz!
            </h2>
            <span className="text-sm text-gray-500">Hesabınıza daxil olmaq üçün məlumatlarınızı doldurun.</span>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
                <Input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 bg-gray-50 border-gray-200 focus:bg-white focus:ring-blue-100 focus:border-blue-500 text-base"
                  placeholder="İstifadəçi adı"
                />

                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 bg-gray-50 border-gray-200 focus:bg-white focus:ring-blue-100 focus:border-blue-500 text-base"
                  placeholder="Şifrə"
                />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember-me" />
                <Label
                  htmlFor="remember-me"
                  className="text-sm text-gray-500 cursor-pointer select-none font-normal"
                >
                  Məni xatırla
                </Label>
              </div>
              <a href="#" className="text-sm font-medium text-gray-500 hover:text-blue-700 transition-colors">
                Şifrənizi unutmusunuz?
              </a>
            </div>

            <div className="space-y-3 pt-2">
                <Button
                type="submit"
                disabled={loading}
                className={`w-full h-12 text-sm font-medium bg-[#1a3789] hover:bg-[#1b5da5] transition-all duration-200 ${
                    loading ? "opacity-75 cursor-not-allowed" : ""
                }`}
                >
                {loading ? "Giriş edilir..." : "Daxil ol"}
                </Button>
              
            </div>

            <div className="pt-8 mt-6">
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                 &copy; {new Date().getFullYear()} MESD. Bütün hüquqları XRİTDX tərəfindən qorunur.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
    </div>
  );
};

export default Login;
