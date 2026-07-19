-- Wrap a Div with class "italic" in LaTeX itshape environment for PDF output.
function Div(el)
  if not el.classes:includes("italic") then
    return nil
  end

  if FORMAT:match("latex") then
    table.insert(el.content, 1, pandoc.RawBlock("latex", "\\begin{itshape}"))
    table.insert(el.content, pandoc.RawBlock("latex", "\\end{itshape}"))
    return el
  end

  -- For non-LaTeX (e.g. epub/html), rely on CSS (.italic { font-style: italic; })
  return el
end
