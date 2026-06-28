import ExpoModulesCore

public class VolumeSOSServiceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VolumeSOSService")

    Events("onChange")

    Function("hello") {
      return "Hello world! 👋"
    }

    AsyncFunction("setValueAsync") { (value: String) in
      self.sendEvent("onChange", [
        "value": value
      ])
    }
  }
}
