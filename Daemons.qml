import QtQuick
import Quickshell
import qs.Ui

BarWidget {
  id: root
  moduleName: "io.github.s3pp3ku.omarchy-daemons"

  function launch() {
    if (!root.bar) return
    root.bar.run("omarchy-launch-webapp " + Qt.resolvedUrl("index.html"))
  }

  implicitWidth: button.implicitWidth
  implicitHeight: button.implicitHeight

  BarIconButton {
    id: button
    anchors.fill: parent
    bar: root.bar
    text: "λ"
    tooltipText: "Launch Omarchy Daemons"
    onPressed: root.launch()
  }
}
