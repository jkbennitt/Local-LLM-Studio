import { Bot, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Section */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">LocalLLM Studio</h1>
          </div>
          
          {/* Status and Actions */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span className="text-sm text-gray-600">Offline Ready</span>
            </div>
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Download className="w-4 h-4 mr-2" />
              Export Model
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
